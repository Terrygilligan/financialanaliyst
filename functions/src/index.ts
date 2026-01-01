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
 * Cloud Function: Set Role
 *
 * This function allows a super_admin to grant roles to a user.
 *
 * Security: Only callable by authenticated users with the 'super_admin' role.
 */
export const setRole = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new Error("Unauthorized: Authentication required");
        }

        try {
            const caller = await auth.getUser(callerUid);
            if (caller.customClaims?.role !== 'super_admin') {
                throw new Error("Only super_admins can set roles");
            }
        } catch (error) {
            throw new Error("Unauthorized: super_admin role required");
        }

        const { uid, role } = request.data;
        if (!uid || !['super_admin', 'admin', 'user'].includes(role)) {
            throw new Error("User UID and a valid role are required");
        }

        try {
            await auth.setCustomUserClaims(uid, { role });
            return {
                success: true,
                message: `Role '${role}' granted to user ${uid}`,
            };
        } catch (error) {
            console.error(`Error setting role for ${uid}:`, error);
            throw new Error(`Failed to set role: ${(error as Error).message}`);
        }
    }
);

/**
 * Cloud Function: List Users
 *
 * This function allows a super_admin to get a list of all users.
 *
 * Security: Only callable by authenticated users with the 'super_admin' role.
 */
export const listUsers = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new Error("Unauthorized: Authentication required");
        }

        try {
            const caller = await auth.getUser(callerUid);
            if (caller.customClaims?.role !== 'super_admin') {
                throw new Error("Only super_admins can perform this action");
            }
        } catch (error) {
            throw new Error("Unauthorized: super_admin role required");
        }

        try {
            const userRecords = await auth.listUsers();
            return userRecords.users.map(user => ({
                uid: user.uid,
                email: user.email,
                role: user.customClaims?.role || 'user'
            }));
        } catch (error) {
            console.error('Error listing users:', error);
            throw new Error(`Could not list users: ${(error as Error).message}`);
        }
    }
);

/**
 * Cloud Function: Get User by Email
 *
 * This function allows a super_admin to get a user's UID by their email.
 *
 * Security: Only callable by authenticated users with the 'super_admin' role.
 */
export const getUserByEmail = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new Error("Unauthorized: Authentication required");
        }

        try {
            const caller = await auth.getUser(callerUid);
            if (caller.customClaims?.role !== 'super_admin') {
                throw new Error("Only super_admins can perform this action");
            }
        } catch (error) {
            throw new Error("Unauthorized: super_admin role required");
        }

        const { email } = request.data;
        if (!email) {
            throw new Error("Email is required");
        }

        try {
            const userRecord = await auth.getUserByEmail(email);
            return { uid: userRecord.uid };
        } catch (error) {
            console.error(`Error fetching user by email ${email}:`, error);
            throw new Error(`Could not fetch user: ${(error as Error).message}`);
        }
    }
);

/**
 * Cloud Function: Revoke Access
 *
 * This function allows a super_admin to delete a user.
 *
--
-
 * Security: Only callable by authenticated users with the 'super_admin' role.
 */
export const revokeAccess = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new Error("Unauthorized: Authentication required");
        }

        try {
            const caller = await auth.getUser(callerUid);
            if (caller.customClaims?.role !== 'super_admin') {
                throw new Error("Only super_admins can revoke access");
            }
        } catch (error) {
            throw new Error("Unauthorized: super_admin role required");
        }

        const { uid } = request.data;
        if (!uid) {
            throw new Error("User UID is required");
        }

        try {
            await auth.deleteUser(uid);
            return {
                success: true,
                message: `User ${uid} has been deleted.`,
            };
        } catch (error) {
            console.error(`Error revoking access for ${uid}:`, error);
            throw new Error(`Failed to revoke access: ${(error as Error).message}`);
        }
    }
);
