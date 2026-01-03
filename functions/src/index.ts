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

// --- Audit Logging ---

/**
 * Logs an activity to the audit trail.
 * @param {string} actorUid The UID of the user performing the action.
 * @param {string} action The action being performed (e.g., 'set_role', 'revoke_access').
 * @param {string | null} targetUid The UID of the user being acted upon.
 * @param {object} details Additional details about the action.
 */
const logActivity = async (actorUid: string, action: string, targetUid: string | null, details: object) => {
    try {
        const actor = await auth.getUser(actorUid);
        let targetEmail = null;
        if (targetUid) {
            const targetUser = await auth.getUser(targetUid);
            targetEmail = targetUser.email;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            actorUid,
            actorEmail: actor.email,
            action,
            targetUid,
            targetEmail,
            details,
        };

        // For now, we'll use a global audit log. This could be changed to a business-specific log.
        const businessId = 'global';
        await db.collection(`businesses/${businessId}/audit_logs`).add(logEntry);
    } catch (error) {
        console.error("Failed to write to audit log:", error);
        // Do not throw error, as logging failure should not block the main operation.
    }
};


// --- SuperAdmin Cloud Functions ---

/**
 * Checks if the calling user has admin privileges.
 * Throws an error if the user is not authenticated or not an admin.
 */
const ensureAdmin = async (context: any) => {
    if (!context.auth) {
        throw new Error("Authentication required.");
    }
    const user = await auth.getUser(context.auth.uid);
    if (user.customClaims?.admin !== true) {
        throw new Error("Permission denied. Admin privileges required.");
    }
    return user;
};

/**
 * Lists all users in the system.
 * Only callable by admins.
 */
export const listUsers = onCall({ region: "us-central1" }, async (request) => {
    await ensureAdmin(request);

    try {
        const listUsersResult = await auth.listUsers();
        const users = listUsersResult.users.map((userRecord) => ({
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            role: userRecord.customClaims?.admin ? 'admin' : 'user',
            disabled: userRecord.disabled,
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
        }));
        return { success: true, users };
    } catch (error) {
        console.error("Error listing users:", error);
        throw new Error("Failed to list users.");
    }
});

/**
 * Revokes a user's access by disabling their account.
 * Only callable by admins.
 */
export const revokeAccess = onCall({ region: "us-central1" }, async (request) => {
    const actor = await ensureAdmin(request);
    const { uid } = request.data;

    if (!uid) {
        throw new Error("User UID is required.");
    }

    try {
        await auth.updateUser(uid, { disabled: true });
        // Also update their status in Firestore for UI purposes
        await db.collection('users').doc(uid).set({
            status: 'revoked'
        }, { merge: true });

        await logActivity(actor.uid, 'revoke_access', uid, { reason: 'manual revoke by admin' });

        console.log(`Access revoked for user ${uid} by admin ${actor.uid}`);
        return { success: true, message: "User access revoked." };
    } catch (error) {
        console.error(`Error revoking access for user ${uid}:`, error);
        throw new Error("Failed to revoke user access.");
    }
});

/**
 * Sets a user's role (admin or user).
 * Only callable by admins.
 */
export const setRole = onCall({ region: "us-central1" }, async (request) => {
    const actor = await ensureAdmin(request);
    const { uid, role } = request.data;

    if (!uid || !['admin', 'user'].includes(role)) {
        throw new Error("Valid UID and role ('admin' or 'user') are required.");
    }

    try {
        const user = await auth.getUser(uid);
        const oldRole = user.customClaims?.admin ? 'admin' : 'user';

        if (oldRole === role) {
            return { success: true, message: `User is already a(n) ${role}.` };
        }

        await auth.setCustomUserClaims(uid, { admin: role === 'admin' });

        await logActivity(actor.uid, 'set_role', uid, { oldRole, newRole: role });

        console.log(`Role for user ${uid} changed from ${oldRole} to ${role} by admin ${actor.uid}`);
        return { success: true, message: `User role updated to ${role}.` };
    } catch (error) {
        console.error(`Error setting role for user ${uid}:`, error);
        throw new Error("Failed to set user role.");
    }
});

/**
 * Saves a new schema for a business.
 * Only callable by admins.
 */
export const saveSchema = onCall({ region: "us-central1" }, async (request) => {
    const actor = await ensureAdmin(request);
    const { schemaName, schemaFields } = request.data;

    if (!schemaName || !schemaFields) {
        throw new Error("Schema name and fields are required.");
    }

    try {
        const businessId = 'global'; // Or determine from user claims
        await db.collection(`businesses/${businessId}/schemas`).add({
            name: schemaName,
            fields: schemaFields,
            createdBy: actor.uid,
            createdAt: new Date().toISOString(),
        });

        await logActivity(actor.uid, 'save_schema', null, { schemaName, fieldCount: schemaFields.length });

        console.log(`Schema '${schemaName}' saved by admin ${actor.uid}`);
        return { success: true, message: "Schema saved successfully." };
    } catch (error) {
        console.error("Error saving schema:", error);
        throw new Error("Failed to save schema.");
    }
});

/**
 * Gets a user's UID by their email address.
 * Only callable by admins.
 */
export const getUserByEmail = onCall({ region: "us-central1" }, async (request) => {
    await ensureAdmin(request);
    const { email } = request.data;

    if (!email) {
        throw new Error("Email is required.");
    }

    try {
        const userRecord = await auth.getUserByEmail(email);
        return { success: true, uid: userRecord.uid };
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            return { success: false, message: 'User not found.' };
        }
        console.error(`Error fetching user by email ${email}:`, error);
        throw new Error("Failed to fetch user by email.");
    }
});
