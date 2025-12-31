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
            return;
        }

        // 4. Get businessId from user's custom claims
        const user = await auth.getUser(userId);
        const businessId = user.customClaims?.businessId;

        if (!businessId) {
            // This is a critical error, as all data is siloed by business.
            // The function should not proceed without a businessId.
            console.error(`FATAL: User ${userId} is not associated with a business (missing businessId claim).`);
            await db.collection('batches').doc(userId).set({
                status: 'error',
                errorFile: filePath,
                errorMessage: `User ${userId} does not have a businessId custom claim.`,
                timestamp: new Date().toISOString()
            }, { merge: true });
            return;
        }


        // 5. Call the core processor function (defined in processor.ts)
        const receiptData: ReceiptData = await processReceiptBatch(fileBuffer, filePath, businessId);

        // 6. Append data to Google Sheets (Steps 8-9)
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

        // 7. Update Firestore Status (Step 10)
        await db.collection('batches').doc(userId).set({
            status: 'complete',
            lastFileProcessed: fileName,
            receiptData: receiptData, // Store the extracted data for reference
            sheetsWriteSuccess: sheetsWriteSuccess,
            googleSheetLink: googleSheetLink,
            timestamp: new Date().toISOString()
        }, { merge: true });

        // 8. Update user statistics in /users collection
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
        
        // Update Firestore status to error
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

/**
 * Cloud Function: Invite a new user to a business.
 *
 * This function allows a business admin to create a new user account
 * associated with their business.
 *
 * - The caller must be an authenticated user.
 * - The caller must have the 'admin' custom claim set to true.
 * - The caller must have a 'businessId' custom claim.
 * - The new user will be created with a 'businessId' custom claim matching the admin's.
 *
 * @param {object} data - The data passed to the function.
 * @param {string} data.email - The email address for the new user.
 * @param {string} data.password - The password for the new user.
 * @returns {Promise<{success: boolean, message: string, uid?: string}>}
 */
export const inviteUserToBusiness = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        // 1. Verify caller is an authenticated admin with a businessId
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const callerUser = await auth.getUser(callerUid);
        const callerClaims = callerUser.customClaims;

        if (!callerClaims?.admin) {
            throw new HttpsError('permission-denied', 'Only admins can invite new users.');
        }

        const businessId = callerClaims.businessId;
        if (!businessId) {
            throw new HttpsError('permission-denied', 'Admin is not associated with a business.');
        }

        // 2. Get new user details from the request
        const { email, password } = request.data;
        if (!email || !password) {
            throw new HttpsError('invalid-argument', 'Email and password are required.');
        }
         if (password.length < 6) {
            throw new HttpsError('invalid-argument', 'Password must be at least 6 characters long.');
        }


        try {
            // 3. Create the new user with the Admin SDK
            const newUserRecord = await auth.createUser({
                email: email,
                password: password,
                emailVerified: true, // Optional: set email as verified
                disabled: false,
            });

            // 4. Set the businessId custom claim for the new user
            await auth.setCustomUserClaims(newUserRecord.uid, { businessId: businessId });

            console.log(`Successfully created new user ${newUserRecord.uid} for business ${businessId}`);

            return {
                success: true,
                message: `User ${email} created successfully.`,
                uid: newUserRecord.uid,
            };
        } catch (error: any) {
            console.error('Error creating new user:', error);
            // Check for specific auth errors
            if (error.code === 'auth/email-already-exists') {
                 throw new HttpsError('already-exists', 'The email address is already in use by another account.');
            }
             if (error.code === 'auth/invalid-password') {
                 throw new HttpsError('invalid-argument', 'The password is not valid. It must be at least 6 characters long.');
            }
            throw new HttpsError('internal', 'An unexpected error occurred while creating the user.');
        }
    }
);

// Reminder: Add your .env configuration for GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY
// and GOOGLE_SHEET_ID before deploying.
