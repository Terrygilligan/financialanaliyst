// functions/src/index.ts

import * as dotenv from 'dotenv';
dotenv.config();

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize the Firebase Admin SDK once
initializeApp();
const storage = getStorage();
const db = getFirestore();
const auth = getAuth();

// --- Import the main processor logic ---
import { processReceiptBatch } from "./processor"; 
import { ReceiptData } from "./schema";
import { appendReceiptToSheet, googleSheetsKey } from "./sheets";

/**
 * Cloud Function Trigger: Activates when a new file is uploaded to Firebase Storage.
 * This is the starting point of the AI Financial Analyst workflow.
 */
export const analyzeReceiptUpload = onObjectFinalized(
    {
        // IMPORTANT: Only trigger on files uploaded to the 'receipts/' prefix
        region: "us-central1",
        maxInstances: 5,
        memory: "1GiB",
        // Make the secret available to this function
        secrets: [googleSheetsKey],
    },
    async (event) => {
    
    // 1. Basic Validation and Path Check
    const file = event.data;
    if (!file || !file.name || !file.bucket) {
        console.error("No file data found in event.");
        return;
    }

    const filePath = file.name; // e.g., receipts/user123/receipt-1678886400.jpg
    const bucketName = file.bucket;
    const eventId = event.id;

    console.log(`File uploaded to bucket: ${bucketName}, path: ${filePath}, eventId: ${eventId}`);
    
    // Ignore files not in the expected path
    if (!filePath.startsWith('receipts/')) {
        console.log(`Ignoring file outside the target path: ${filePath}`);
        return;
    }

    // 2. Pre-flight Memory Protection (OOM Prevention)
    // Check file size from metadata before downloading.
    // Limit: 10MB (Gemini has limits, and we want to avoid RAM exhaustion)
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    const fileSize = file.size ? parseInt(file.size.toString(), 10) : 0;

    if (fileSize > MAX_FILE_SIZE_BYTES) {
        console.error(`File ${filePath} is too large (${fileSize} bytes). Max allowed: ${MAX_FILE_SIZE_BYTES} bytes.`);
        // Mark as error in DB without processing
        const pathParts = filePath.split('/');
        const userId = pathParts[1];
        if (userId) {
            await db.collection('batches').doc(userId).set({
                status: 'error',
                errorFile: filePath,
                errorMessage: `File too large (${(fileSize / 1024 / 1024).toFixed(2)}MB). Max 10MB.`,
                timestamp: new Date().toISOString()
            }, { merge: true });
        }
        return;
    }

    // 3. Idempotency Check
    // Ensure we don't process the same event twice (double-billing/counting risk)
    const idempotencyRef = db.collection('processed_events').doc(eventId);

    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(idempotencyRef);
            if (doc.exists) {
                throw new Error("ALREADY_PROCESSED");
            }
            transaction.set(idempotencyRef, {
                filePath,
                timestamp: new Date().toISOString()
            });
        });
    } catch (error) {
        if ((error as Error).message === "ALREADY_PROCESSED") {
            console.log(`Event ${eventId} already processed. Skipping.`);
            return;
        }
        // If transaction fails for other reasons, we might want to retry or log
        console.error("Idempotency check failed:", error);
        throw error; // Retry
    }

    console.log(`Starting analysis for file: ${filePath}`);

    try {
        // 4. Download the File Buffer from Storage
        const bucket = storage.bucket(bucketName);
        const [fileBuffer] = await bucket.file(filePath).download();
        
        // 5. Extract necessary metadata (userId, filename)
        const pathParts = filePath.split('/');
        const userId = pathParts[1];
        const fileName = pathParts.pop();

        if (!userId) {
            console.error(`Could not determine userId from path: ${filePath}`);
            return;
        }

        // 6. Call the core processor function
        const receiptData: ReceiptData = await processReceiptBatch(fileBuffer, filePath);

        // 7. Append data to Google Sheets
        const sheetId = process.env.GOOGLE_SHEET_ID;
        let sheetsWriteSuccess = false;
        let googleSheetLink = null;
        
        if (sheetId) {
            try {
                await appendReceiptToSheet(receiptData, sheetId);
                console.log(`Receipt data successfully written to Google Sheet: ${sheetId}`);
                sheetsWriteSuccess = true;
                googleSheetLink = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
            } catch (sheetsError) {
                console.error(`Failed to write to Google Sheet: ${(sheetsError as Error).message}`);
                // Don't fail the batch, just log
            }
        }

        // 8. Update Firestore Status
        await db.collection('batches').doc(userId).set({
            status: 'complete',
            lastFileProcessed: fileName,
            receiptData: receiptData,
            sheetsWriteSuccess: sheetsWriteSuccess,
            googleSheetLink: googleSheetLink,
            timestamp: new Date().toISOString()
        }, { merge: true });

        // 9. Update user statistics in /users collection (Safe Increment)
        // We use FieldValue.increment to be atomic, though strict accounting might prefer transactions.
        // Given we have the idempotency wrapper above, simple increment is safer now.
        const userRef = db.collection('users').doc(userId);
        const { FieldValue } = await import('firebase-admin/firestore');
        
        await userRef.set({
            totalReceipts: FieldValue.increment(1),
            totalAmount: FieldValue.increment(receiptData.totalAmount || 0),
            lastUpdated: new Date().toISOString(),
            lastReceiptProcessed: fileName,
            lastReceiptTimestamp: new Date().toISOString()
        }, { merge: true });

        console.log(`Analysis complete for ${fileName}. Data:`, receiptData);

    } catch (error) {
        console.error(`FATAL ERROR processing file ${filePath}:`, error);
        
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
 */
export const setAdminClaim = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const targetUserId = request.data.uid;
        if (!targetUserId) {
            throw new Error("User UID is required");
        }

        const callerUid = request.auth?.uid;
        if (callerUid) {
            try {
                const caller = await auth.getUser(callerUid);
                if (!caller.customClaims?.admin) {
                    const allUsers = await auth.listUsers();
                    const hasAdmin = allUsers.users.some(u => u.customClaims?.admin);
                    if (hasAdmin) {
                        throw new Error("Only existing admins can grant admin privileges");
                    }
                }
            } catch (error) {
                // Fixed: Propagate the error properly
                if ((error as Error).message.includes("Only existing admins")) {
                    throw new Error("Permission Denied: Only existing admins can grant admin privileges.");
                }
                console.error("Error checking caller admin status:", error);
                throw new Error("Internal Error verifying admin status.");
            }
        }

        try {
            await auth.setCustomUserClaims(targetUserId, { admin: true });
            console.log(`Admin claim set for user: ${targetUserId}`);
            return { success: true, message: `Admin privileges granted to user ${targetUserId}` };
        } catch (error) {
            console.error(`Error setting admin claim for ${targetUserId}:`, error);
            throw new Error(`Failed to set admin claim: ${(error as Error).message}`);
        }
    }
);

/**
 * Cloud Function: Remove Admin Custom Claim
 */
export const removeAdminClaim = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const targetUserId = request.data.uid;
        if (!targetUserId) throw new Error("User UID is required");

        const callerUid = request.auth?.uid;
        if (!callerUid) throw new Error("Unauthorized: Authentication required");
        
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
            return { success: true, message: `Admin privileges removed from user ${targetUserId}` };
        } catch (error) {
            console.error(`Error removing admin claim for ${targetUserId}:`, error);
            throw new Error(`Failed to remove admin claim: ${(error as Error).message}`);
        }
    }
);
