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
    
    // Ignore files not in the new multi-tenant path
    if (!filePath.startsWith('tenants/')) {
        console.log(`Ignoring file outside the target path: ${filePath}`);
        return;
    }

    console.log(`Starting analysis for file: ${filePath}`);

    try {
        // 2. Download the File Buffer from Storage
        const bucket = storage.bucket(bucketName);
        const [fileBuffer] = await bucket.file(filePath).download();
        
        // 3. Extract metadata from the new multi-tenant path
        // Expected format: tenants/{businessId}/drivers/{driverId}/receipts/{fileName}
        const pathParts = filePath.split('/');
        if (pathParts.length < 5 || pathParts[0] !== 'tenants' || pathParts[2] !== 'drivers') {
            console.error(`Invalid file path format for multi-tenancy: ${filePath}`);
            return;
        }
        const businessId = pathParts[1];
        const driverId = pathParts[3];
        const fileName = pathParts.pop();

        if (!businessId || !driverId || !fileName) {
            console.error(`Could not determine businessId, driverId, or fileName from path: ${filePath}`);
            return;
        }

        // 4. Call the core processor function (this logic is preserved)
        const receiptData: ReceiptData = await processReceiptBatch(fileBuffer, filePath);

        // 5. [DISABLED] Google Sheets integration is disabled for multi-tenancy
        console.log("Google Sheets integration is disabled.");

        // 6. Write extracted data to the correct Firestore silo
        // New path: /businesses/{businessId}/receipts/{receiptId}
        const receiptId = fileName; // Use filename as a unique ID for the receipt
        const receiptRef = db.collection('businesses').doc(businessId).collection('receipts').doc(receiptId);

        await receiptRef.set({
            status: 'complete',
            driverId: driverId,
            fileName: fileName,
            filePath: filePath,
            ...receiptData, // Spread the extracted receipt data
            timestamp: new Date().toISOString()
        }, { merge: true });

        console.log(`Analysis complete for ${fileName}. Data written to Firestore silo: /businesses/${businessId}/receipts/${receiptId}`);

    } catch (error) {
        console.error(`FATAL ERROR processing file ${filePath}:`, error);
        
        // Update Firestore status to error in the correct silo
        const pathParts = filePath.split('/');
        if (pathParts.length > 3 && pathParts[0] === 'tenants') {
            const businessId = pathParts[1];
            const driverId = pathParts[3];
            const receiptId = pathParts[pathParts.length - 1] || 'unknown_receipt';

            await db.collection('businesses').doc(businessId).collection('receipts').doc(receiptId).set({
                status: 'error',
                driverId: driverId,
                errorFile: filePath,
                errorMessage: (error as Error).message,
                timestamp: new Date().toISOString()
            }, { merge: true });
        } else {
            console.error(`Could not log error to Firestore due to invalid path: ${filePath}`);
        }
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

// Reminder: Add your .env configuration for GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY
// and GOOGLE_SHEET_ID before deploying.
