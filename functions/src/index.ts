// functions/src/index.ts

// Load environment variables from .env file (for local development)
// In production, these should be set via Secret Manager or runtime config
import * as dotenv from 'dotenv';
dotenv.config();

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
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

        // 4. Get businessId from user's custom claims to fetch the correct schema.
        const userRecord = await auth.getUser(userId);
        const businessId = userRecord.customClaims?.businessId;

        if (!businessId) {
            console.error(`User ${userId} does not have a businessId custom claim.`);
            // Update Firestore with an error state
            await db.collection('batches').doc(userId).set({
                status: 'error',
                errorFile: filePath,
                errorMessage: 'User is not associated with a business.',
                timestamp: new Date().toISOString()
            }, { merge: true });
            return;
        }

        console.log(`User ${userId} belongs to business ${businessId}. Fetching schema...`);

        // 5. Fetch custom schema definitions for the business.
        const schemaDefinitions = new Map<string, any>();
        try {
            const schemaSnapshot = await db.collection(`businesses/${businessId}/schema_definitions`).get();
            if (!schemaSnapshot.empty) {
                schemaSnapshot.forEach(doc => {
                    schemaDefinitions.set(doc.id, doc.data());
                });
                console.log(`Loaded ${schemaDefinitions.size} schema definitions for business ${businessId}.`);
            } else {
                console.log(`No custom schema definitions found for business ${businessId}. Using default schema.`);
            }
        } catch (schemaError) {
            console.error(`Error fetching schema for business ${businessId}:`, schemaError);
            // Decide if you want to proceed with a default schema or fail.
            // For now, we'll proceed with an empty schema map.
        }


        // 6. Call the core processor function with the custom schema.
        const receiptData: ReceiptData = await processReceiptBatch(fileBuffer, filePath, schemaDefinitions);

        // 7. Append data to Google Sheets (Steps 8-9)
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

        // 8. Update Firestore Status (Step 10)
        // Note: The data is now stored under the business collection for proper siloing.
        const batchRef = db.collection(`businesses/${businessId}/batches`).doc(); // Create a new doc for each receipt
        await batchRef.set({
            userId: userId, // Keep track of which user uploaded it
            status: 'complete',
            fileName: fileName,
            receiptData: receiptData,
            sheetsWriteSuccess: sheetsWriteSuccess,
            googleSheetLink: googleSheetLink,
            timestamp: new Date().toISOString()
        });

        // 9. Update user statistics in /users collection
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

    } catch (error) {
        console.error(`FATAL ERROR processing file ${filePath}:`, error);
        
        // Update Firestore status to error (Step 10)
        const errorPathParts = filePath.split('/');
        const errorUserId = errorPathParts[1] || 'unknown';

        // Try to get businessId even on error to log correctly
        let businessIdForError = 'unknown';
        try {
            const userRecordOnError = await auth.getUser(errorUserId);
            businessIdForError = userRecordOnError.customClaims?.businessId || 'unknown';
        } catch (e) {
            // User might not exist or other auth error
        }

        const errorBatchRef = db.collection(`businesses/${businessIdForError}/batches`).doc();
        await errorBatchRef.set({
            userId: errorUserId,
            status: 'error',
            fileName: errorPathParts.pop() || 'unknown',
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
 * Cloud Function: Admin Create User
 *
 * This function allows a tenant admin to create a new user within their own business.
 * The new user is automatically assigned the admin's `businessId` and a 'driver' role.
 *
 * Security: The function is protected by checking the caller's custom claims for `role: 'admin'`.
 */
export const adminCreateUser = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        // 1. Verify the caller is an admin.
        if (request.auth?.token?.role !== 'admin') {
            throw new HttpsError('permission-denied', 'Only admins can create users.');
        }

        // 2. Get the admin's businessId from their custom claims.
        const businessId = request.auth?.token?.businessId;
        if (!businessId) {
            throw new HttpsError('failed-precondition', 'Admin user is not associated with a business.');
        }

        // 3. Get new user data from the request.
        const { email, password, displayName } = request.data;
        if (!email || !password || !displayName) {
            throw new HttpsError('invalid-argument', 'Email, password, and display name are required.');
        }

        try {
            // 4. Create the new user.
            const userRecord = await auth.createUser({
                email,
                password,
                displayName,
            });

            // 5. Set custom claims for the new user.
            await auth.setCustomUserClaims(userRecord.uid, {
                businessId: businessId,
                role: 'driver' // Default role for new users
            });

            // 6. Create a user profile document in Firestore (optional but good practice)
            //    This helps in listing/managing users from the frontend.
            await db.collection('users').doc(userRecord.uid).set({
                email: userRecord.email,
                displayName: userRecord.displayName,
                businessId: businessId,
                role: 'driver',
                createdAt: new Date().toISOString()
            });

            console.log(`Admin ${request.auth?.uid} created new user ${userRecord.uid} in business ${businessId}`);

            return {
                success: true,
                message: `User ${displayName} created successfully with UID: ${userRecord.uid}`,
                uid: userRecord.uid
            };
        } catch (error) {
            console.error(`Error creating user by admin ${request.auth?.uid}:`, error);
            if (error instanceof Error) {
                 // Check for specific auth errors
                 if ((error as any).code === 'auth/email-already-exists') {
                    throw new HttpsError('already-exists', 'A user with this email already exists.');
                 }
                 throw new HttpsError('internal', error.message);
            }
            throw new HttpsError('internal', 'An unknown error occurred while creating the user.');
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

// Reminder: Add your .env configuration for GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY
// and GOOGLE_SHEET_ID before deploying.
