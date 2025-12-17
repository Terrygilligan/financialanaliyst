// functions/src/index.ts

// Load environment variables from .env file (for local development)
// In production, these should be set via Secret Manager or runtime config
import * as dotenv from 'dotenv';
dotenv.config();

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize the Firebase Admin SDK once for all functions
initializeApp();
const storage = getStorage();
const db = getFirestore();
const auth = getAuth();

// --- Import the main processor logic ---
import { processReceiptBatch } from "./processor"; 
import { ReceiptData } from "./schema";
import { appendReceiptToSheet } from "./sheets";
import { lookupEntityForUser } from "./entities";
import { convertReceiptToBaseCurrency } from "./currency"; 

/**
 * Cloud Function Trigger: Activates when a new file is uploaded to Firebase Storage.
 * This is the starting point of the AI Financial Analyst workflow.
 */
export const analyzeReceiptUpload = onObjectFinalized(
    {
        // IMPORTANT: Only trigger on files uploaded to the 'receipts/' prefix
        region: "us-central1", // Use a region near your Firestore/Gemini location
        maxInstances: 5, // Limit concurrent runs for cost control
        memory: "1GiB", // Increase memory for image processing and AI API calls
    },
    async (event) => {
    
    // 1. Basic Validation and Path Check
    const file = event.data;
    if (!file || !file.name || !file.bucket) {
        console.error("No file data found in event.");
        return;
    }

    const filePath = file.name; // e.g., receipts/user123/receipt-1678886400.jpg
    const bucketName = file.bucket; // Get bucket from event
    
    console.log(`File uploaded to bucket: ${bucketName}, path: ${filePath}`);
    
    // Ignore files not in the expected path or files created during processing (e.g., resized versions)
    if (!filePath.startsWith('receipts/')) {
        console.log(`Ignoring file outside the target path: ${filePath}`);
        return;
    }

    console.log(`Starting analysis for file: ${filePath}`);

    try {
        // 2. Download the File Buffer from Storage
        const bucket = storage.bucket(bucketName);
        const [fileBuffer] = await bucket.file(filePath).download();
        
        // 3. Extract necessary metadata (userId, filename)
        // Assume path format is: receipts/{userId}/{filename}
        const pathParts = filePath.split('/');
        const userId = pathParts[1];
        const fileName = pathParts.pop();

        if (!userId) {
            console.error(`Could not determine userId from path: ${filePath}`);
            // TODO: Log status to Firestore as 'error'
            return;
        }

        // 4. Call the core processor function (defined in processor.ts)
        const receiptData: ReceiptData = await processReceiptBatch(fileBuffer, filePath);

        // 4.5. Look up entity for user (Phase 1.1: Entity Tracking)
        const entityName = await lookupEntityForUser(userId);
        receiptData.entity = entityName;

        // 4.6. Currency conversion (Phase 2.4: Currency Conversion)
        // Extract currency from Gemini response (if available)
        const extractedCurrency = receiptData.currency;
        if (extractedCurrency) {
            console.log(`Receipt currency detected: ${extractedCurrency}`);
            const conversionResult = await convertReceiptToBaseCurrency(
                receiptData.totalAmount,
                extractedCurrency
            );

            if (conversionResult) {
                if (conversionResult.exchangeRate !== 1.0) {
                    // Currency conversion was performed (different currency)
                    receiptData.originalCurrency = conversionResult.originalCurrency;
                    receiptData.originalAmount = conversionResult.originalAmount;
                    receiptData.totalAmount = conversionResult.convertedAmount;
                    receiptData.exchangeRate = conversionResult.exchangeRate;
                    receiptData.conversionDate = conversionResult.conversionDate;
                    console.log(`Converted ${conversionResult.originalAmount} ${conversionResult.originalCurrency} to ${conversionResult.convertedAmount} ${conversionResult.baseCurrency} (rate: ${conversionResult.exchangeRate})`);
                } else {
                    // Same currency (exchangeRate === 1.0) - still record currency info for consistency
                    receiptData.originalCurrency = conversionResult.originalCurrency;
                    receiptData.originalAmount = conversionResult.originalAmount;
                    receiptData.exchangeRate = conversionResult.exchangeRate;
                    receiptData.conversionDate = conversionResult.conversionDate;
                    console.log(`Receipt already in base currency ${conversionResult.baseCurrency}, no conversion needed`);
                }
            } else {
                // Conversion failed - log warning but continue with original amount
                console.warn(`Currency conversion failed for ${extractedCurrency}. Using original amount.`);
            }
        }

        // Phase 2: Feature Flag - Check if review workflow is enabled
        const enableReviewWorkflow = process.env.ENABLE_REVIEW_WORKFLOW === 'true';
        
        if (enableReviewWorkflow) {
            // New workflow: Store as pending for user review
            // This will be implemented in Phase 2.2: Pending Receipts System
            console.log(`Review workflow enabled. Storing receipt as pending for user review.`);
            
            // Store receipt in pending_receipts collection for user review
            const receiptId = `${userId}_${Date.now()}_${fileName}`;
            await db.collection('pending_receipts').doc(receiptId).set({
                userId: userId,
                fileName: fileName,
                filePath: filePath,
                receiptData: receiptData,
                status: 'pending_review',
                createdAt: new Date().toISOString(),
                timestamp: new Date().toISOString()
            });

            // Update batches collection with pending status
            await db.collection('batches').doc(userId).set({
                status: 'pending_review',
                lastFileProcessed: fileName,
                receiptData: receiptData,
                pendingReceiptId: receiptId,
                timestamp: new Date().toISOString()
            }, { merge: true });

            // Update user statistics using transaction to prevent race conditions
            // Note: totalAmount is not updated here; it will be updated when receipt is finalized
            const userRef = db.collection('users').doc(userId);
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const currentStats = userDoc.exists ? (userDoc.data() || { totalReceipts: 0, totalAmount: 0, pendingReceipts: 0 }) : { totalReceipts: 0, totalAmount: 0, pendingReceipts: 0 };
                
                transaction.set(userRef, {
                    pendingReceipts: (currentStats.pendingReceipts || 0) + 1,
                    lastUpdated: new Date().toISOString(),
                    lastReceiptProcessed: fileName,
                    lastReceiptTimestamp: new Date().toISOString()
                }, { merge: true });
            });

            console.log(`Receipt stored as pending for review. Receipt ID: ${receiptId}`);
        } else {
            // Existing workflow: Direct processing and Sheets write
            // 5. Append data to Google Sheets (Steps 8-9)
            const sheetId = process.env.GOOGLE_SHEET_ID;
            let sheetsWriteSuccess = false;
            let googleSheetLink = null;
            
            // Debug logging for environment variables
            console.log("Environment check:", {
                hasSheetId: !!sheetId,
                sheetIdLength: sheetId?.length || 0,
                hasServiceAccountKey: !!process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY,
                hasGeminiKey: !!process.env.GEMINI_API_KEY
            });
            
            if (sheetId) {
                try {
                    await appendReceiptToSheet(receiptData, sheetId);
                    console.log(`Receipt data successfully written to Google Sheet: ${sheetId}`);
                    sheetsWriteSuccess = true;
                    googleSheetLink = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
                } catch (sheetsError) {
                    // Log Sheets error but don't fail the entire operation
                    // The receipt was processed successfully, Sheets write is secondary
                    console.error(`Failed to write to Google Sheet: ${(sheetsError as Error).message}`);
                    console.error("Full error:", sheetsError);
                }
            } else {
                console.error("❌ GOOGLE_SHEET_ID not set in environment variables!");
                console.error("This means environment variables are not configured for the deployed function.");
                console.error("For Firebase Functions 2nd Gen, you need to set environment variables via:");
                console.error("1. Google Cloud Console → Cloud Functions → Environment Variables");
                console.error("2. OR Firebase Functions Secrets");
            }

            // 6. Update Firestore Status (Step 10)
            await db.collection('batches').doc(userId).set({
                status: 'complete',
                lastFileProcessed: fileName,
                receiptData: receiptData, // Store the extracted data for reference
                sheetsWriteSuccess: sheetsWriteSuccess,
                googleSheetLink: googleSheetLink,
                timestamp: new Date().toISOString()
            }, { merge: true });

            // 7. Update user statistics in /users collection
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            const currentStats = userDoc.exists ? (userDoc.data() || { totalReceipts: 0, totalAmount: 0 }) : { totalReceipts: 0, totalAmount: 0 };
            
            await userRef.set({
                totalReceipts: (currentStats.totalReceipts || 0) + 1,
                totalAmount: (currentStats.totalAmount || 0) + (receiptData.totalAmount || 0),
                lastUpdated: new Date().toISOString(),
                lastReceiptProcessed: fileName,
                lastReceiptTimestamp: new Date().toISOString()
            }, { merge: true });

            console.log(`Analysis complete for ${fileName}. Data:`, receiptData);
        }

    } catch (error) {
        console.error(`FATAL ERROR processing file ${filePath}:`, error);
        
        // Update Firestore status to error (Step 10)
        const pathParts = filePath.split('/');
        const userId = pathParts[1] || 'unknown';
        await db.collection('batches').doc(userId).set({
            status: 'error',
            errorFile: filePath,
            errorMessage: (error as Error).message,
            timestamp: new Date().toISOString()
        }, { merge: true });
    }
});

/**
 * Cloud Function: Set Admin Custom Claim
 * 
 * This function allows an existing admin (or super-admin) to grant admin privileges
 * to a user by setting a custom claim on their auth token.
 * 
 * Usage (via Firebase Console or HTTP call):
 * - Call this function with the target user's UID
 * - Only callable by authenticated users (you can add additional checks)
 * 
 * Security: In production, you should add additional checks to ensure only
 * authorized users can call this function (e.g., check if caller is already admin).
 */
export const setAdminClaim = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        // Get the target user UID from the request
        const targetUserId = request.data.uid;
        
        if (!targetUserId) {
            throw new Error("User UID is required");
        }

        // Optional: Verify the caller is already an admin
        // For initial setup, you might want to skip this check
        const callerUid = request.auth?.uid;
        if (callerUid) {
            try {
                const caller = await auth.getUser(callerUid);
                if (!caller.customClaims?.admin) {
                    // Optional: Allow if no admins exist yet (bootstrap scenario)
                    const allUsers = await auth.listUsers();
                    const hasAdmin = allUsers.users.some(u => u.customClaims?.admin);
                    if (hasAdmin) {
                        throw new Error("Only existing admins can grant admin privileges");
                    }
                }
            } catch (error) {
                // Re-throw authorization errors instead of silently suppressing them
                if (error instanceof Error && error.message.includes("Only existing admins")) {
                    throw error;
                }
                console.error("Error checking caller admin status:", error);
                // For initial setup, allow the call only for non-authorization errors
            }
        }

        try {
            // Set the custom claim
            await auth.setCustomUserClaims(targetUserId, { admin: true });
            
            console.log(`Admin claim set for user: ${targetUserId}`);
            
            return {
                success: true,
                message: `Admin privileges granted to user ${targetUserId}`,
            };
        } catch (error) {
            console.error(`Error setting admin claim for ${targetUserId}:`, error);
            throw new Error(`Failed to set admin claim: ${(error as Error).message}`);
        }
    }
);

/**
 * Cloud Function: Remove Admin Custom Claim
 * 
 * Removes admin privileges from a user.
 */
export const removeAdminClaim = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const targetUserId = request.data.uid;
        
        if (!targetUserId) {
            throw new Error("User UID is required");
        }

        // Verify caller is authenticated and is admin
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new Error("Unauthorized: Authentication required");
        }
        
        try {
            const caller = await auth.getUser(callerUid);
            if (!caller.customClaims?.admin) {
                throw new Error("Only admins can remove admin privileges");
            }
        } catch (error) {
            throw new Error("Unauthorized: Admin privileges required");
        }

        try {
            await auth.setCustomUserClaims(targetUserId, { admin: false });
            console.log(`Admin claim removed for user: ${targetUserId}`);
            
            return {
                success: true,
                message: `Admin privileges removed from user ${targetUserId}`,
            };
        } catch (error) {
            console.error(`Error removing admin claim for ${targetUserId}:`, error);
            throw new Error(`Failed to remove admin claim: ${(error as Error).message}`);
        }
    }
);

// Phase 1.3: Archive function
export { archiveData } from "./archive";

// Phase 2.1: Finalize receipt function
export { finalizeReceipt } from "./finalize";

// Phase 2.2: Category management functions
export { getCategories, createCategory, updateCategory, deleteCategory } from "./categories";

// Phase 2.6: Admin review functions
export { adminApproveReceipt, adminRejectReceipt } from "./admin-review";

// Reminder: Add your .env configuration for GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY
// and GOOGLE_SHEET_ID before deploying.
