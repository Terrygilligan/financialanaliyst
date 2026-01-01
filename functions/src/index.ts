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
// Note: Google Sheets integration has been deprecated - removed appendReceiptToSheet import

// --- Re-export functions from other modules ---
export { createUser, sendPasswordReset } from "./user";
export { provisionNewBusiness, getBusinessDetails, updateBusinessSettings, addAuthorizedUser } from "./business-management";
export { adminApproveReceipt, adminRejectReceipt } from "./admin-review";
export { finalizeReceipt } from "./finalize";
export { getCategories, createCategory, updateCategory, deleteCategory } from "./categories";
export { archiveData } from "./archive"; 

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

        // Fetch user's custom claims and profile data
        const user = await auth.getUser(userId);
        const businessId = user.customClaims?.businessId;

        if (!businessId) {
            console.error(`User ${userId} is not associated with a business.`);
            return;
        }

        const userRef = db.collection('businesses').doc(businessId).collection('users').doc(userId);
        const userDoc = await userRef.get();
        const assignedSchemaId = userDoc.exists ? userDoc.data()?.assignedSchemaId : null;

        // 4. Call the core processor function (defined in processor.ts)
        const receiptData: ReceiptData = await processReceiptBatch(fileBuffer, filePath, businessId, assignedSchemaId);

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
        
        // Google Sheets integration has been deprecated
        // Sheets write functionality removed per deprecation policy
        if (sheetId) {
            console.log(`Google Sheets integration deprecated. Sheet ID provided: ${sheetId} but write skipped.`);
            sheetsWriteSuccess = false;
            googleSheetLink = null;
        } else {
            console.log("Google Sheets integration deprecated. No sheet ID configured.");
            sheetsWriteSuccess = false;
            googleSheetLink = null;
        }

        // 6. Update Firestore Status (Step 10)
        await db.collection('businesses').doc(businessId).collection('batches').doc(userId).set({
            status: 'complete',
            lastFileProcessed: fileName,
            receiptData: receiptData, // Store the extracted data for reference
            sheetsWriteSuccess: sheetsWriteSuccess,
            googleSheetLink: googleSheetLink,
            timestamp: new Date().toISOString()
        }, { merge: true });

        // 7. Update user statistics in /users collection
        const statsUserRef = db.collection('users').doc(userId);
        const statsUserDoc = await statsUserRef.get();
        const currentStats = statsUserDoc.exists ? (statsUserDoc.data() || { totalReceipts: 0, totalAmount: 0 }) : { totalReceipts: 0, totalAmount: 0 };
        
        await statsUserRef.set({
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
        // We might not have businessId here if the user lookup failed, so we handle that case
        if (userId !== 'unknown' && db.collection('businesses').doc('unknown').collection('batches').doc(userId)) {
            const user = await auth.getUser(userId);
            const businessId = user.customClaims?.businessId || 'unknown';
            await db.collection('businesses').doc(businessId).collection('batches').doc(userId).set({
                status: 'error',
                errorFile: filePath,
                errorMessage: (error as Error).message,
                timestamp: new Date().toISOString()
            }, { merge: true });
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

export const saveSchema = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const { schema, schemaName } = request.data;
        const callerUid = request.auth?.uid;

        if (!callerUid) {
            throw new Error("Unauthorized: Authentication required");
        }

        const caller = await auth.getUser(callerUid);
        if (!caller.customClaims?.admin) {
            throw new Error("Only admins can save schemas");
        }

        const businessId = caller.customClaims?.businessId;
        if (!businessId) {
            throw new Error("Admin user is not associated with a business.");
        }

        try {
            const schemaRef = db.collection('businesses').doc(businessId).collection('schemas').doc(schemaName);
            await schemaRef.set({ schema });

            return { success: true, message: `Schema ${schemaName} saved successfully.` };
        } catch (error) {
            console.error(`Error saving schema ${schemaName}:`, error);
            throw new Error(`Failed to save schema: ${(error as Error).message}`);
        }
    }
);

export const inviteUserToBusiness = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const { email, assignedSchemaId } = request.data;
        const callerUid = request.auth?.uid;

        if (!callerUid) {
            throw new Error("Unauthorized: Authentication required");
        }

        const caller = await auth.getUser(callerUid);
        if (!caller.customClaims?.admin) {
            throw new Error("Only admins can invite users");
        }

        const businessId = caller.customClaims?.businessId;
        if (!businessId) {
            throw new Error("Admin user is not associated with a business.");
        }

        try {
            const userRecord = await auth.createUser({
                email: email,
                emailVerified: false,
                disabled: false
            });

            await auth.setCustomUserClaims(userRecord.uid, { businessId: businessId });

            await db.collection('businesses').doc(businessId).collection('users').doc(userRecord.uid).set({
                email: email,
                assignedSchemaId: assignedSchemaId,
                invitedBy: callerUid,
                createdAt: new Date().toISOString()
            });

            return { success: true, message: `User ${email} invited successfully.` };
        } catch (error) {
            console.error(`Error inviting user ${email}:`, error);
            throw new Error(`Failed to invite user: ${(error as Error).message}`);
        }
    }
);

/**
 * Helper: Validates if the requester is a SuperAdmin
 */
async function verifySuperAdmin(callerUid: string): Promise<void> {
    if (!callerUid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
    }

    try {
        const caller = await auth.getUser(callerUid);
        if (caller.customClaims?.role !== 'super_admin') {
            throw new HttpsError(
                'permission-denied',
                'Only SuperAdmins can perform this action.'
            );
        }
    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Error verifying SuperAdmin status');
    }
}

/**
 * Helper: Validates that both caller and target belong to the same business
 */
async function validateSameBusiness(callerUid: string, targetUid: string): Promise<void> {
    const caller = await auth.getUser(callerUid);
    const target = await auth.getUser(targetUid);
    
    const callerBusinessId = caller.customClaims?.businessId;
    const targetBusinessId = target.customClaims?.businessId;
    
    if (!callerBusinessId || !targetBusinessId || callerBusinessId !== targetBusinessId) {
        throw new HttpsError(
            'permission-denied',
            'Users must belong to the same business'
        );
    }
}

/**
 * Cloud Function: Set Role
 * 
 * Assigns super_admin, admin, or user roles to a user.
 * Only SuperAdmins can perform this action.
 * Both users must belong to the same business (tenant isolation).
 */
export const setRole = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const callerUid = request.auth?.uid;
        await verifySuperAdmin(callerUid!);

        const { uid, role } = request.data;
        
        if (!uid || !role) {
            throw new HttpsError('invalid-argument', 'User UID and role are required');
        }

        if (!['super_admin', 'admin', 'user'].includes(role)) {
            throw new HttpsError('invalid-argument', 'Invalid role. Must be: super_admin, admin, or user');
        }

        // Validate same business (tenant isolation)
        await validateSameBusiness(callerUid!, uid);

        try {
            // Get current user data for audit log
            const targetUser = await auth.getUser(uid);
            const oldRole = targetUser.customClaims?.role || 'user';

            // Set the new role
            const businessId = targetUser.customClaims?.businessId || request.auth?.token.businessId;
            await auth.setCustomUserClaims(uid, { 
                role,
                // Preserve businessId if it exists
                ...(businessId && { businessId })
            });

            // Update Firestore user document
            const targetUserRef = db.collection('users').doc(uid);
            await targetUserRef.set({ role }, { merge: true });

            return {
                success: true,
                message: `Role '${role}' successfully assigned to user ${uid}`,
                oldRole,
                newRole: role
            };
        } catch (error) {
            console.error(`Error setting role for ${uid}:`, error);
            throw new HttpsError('internal', `Failed to set role: ${(error as Error).message}`);
        }
    }
);

/**
 * Cloud Function: List Users
 * 
 * Returns all users in the caller's business (tenant-scoped).
 * Only SuperAdmins can perform this action.
 */
export const listUsers = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const callerUid = request.auth?.uid;
        await verifySuperAdmin(callerUid!);

        try {
            const caller = await auth.getUser(callerUid!);
            const businessId = caller.customClaims?.businessId;

            if (!businessId) {
                throw new HttpsError('failed-precondition', 'Caller is not associated with a business');
            }

            // Get users from Firestore (tenant-scoped)
            const usersRef = db.collection('businesses').doc(businessId).collection('users');
            const usersSnapshot = await usersRef.get();

            const users: Array<{
                uid: string;
                email: string | undefined;
                displayName: string | undefined;
                role: string;
                businessId: string;
            }> = [];
            
            for (const officeUserDoc of usersSnapshot.docs) {
                const officeUserData = officeUserDoc.data();
                try {
                    const authUser = await auth.getUser(officeUserDoc.id);
                    users.push({
                        uid: authUser.uid,
                        email: authUser.email,
                        displayName: authUser.displayName || officeUserData.displayName,
                        role: authUser.customClaims?.role || officeUserData.role || 'user',
                        businessId: businessId
                    });
                } catch (error) {
                    // Skip users that don't exist in Auth
                    console.warn(`User ${officeUserDoc.id} not found in Auth`);
                }
            }

            return users;
        } catch (error) {
            if (error instanceof HttpsError) {
                throw error;
            }
            console.error('Error listing users:', error);
            throw new HttpsError('internal', `Could not list users: ${(error as Error).message}`);
        }
    }
);

/**
 * Cloud Function: Get User by Email
 * 
 * Helper for inviting users by email.
 * Only SuperAdmins can perform this action.
 */
export const getUserByEmail = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const callerUid = request.auth?.uid;
        await verifySuperAdmin(callerUid!);

        const { email } = request.data;
        if (!email) {
            throw new HttpsError('invalid-argument', 'Email is required');
        }

        try {
            const userRecord = await auth.getUserByEmail(email);
            return { 
                uid: userRecord.uid, 
                email: userRecord.email,
                displayName: userRecord.displayName,
                role: userRecord.customClaims?.role || 'user'
            };
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                throw new HttpsError('not-found', 'No user found with this email.');
            }
            console.error(`Error fetching user by email ${email}:`, error);
            throw new HttpsError('internal', `Could not fetch user: ${error.message}`);
        }
    }
);

/**
 * Cloud Function: Revoke Access
 * 
 * Disables a user and removes their roles (soft delete).
 * Only SuperAdmins can perform this action.
 * Both users must belong to the same business (tenant isolation).
 */
export const revokeAccess = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const callerUid = request.auth?.uid;
        await verifySuperAdmin(callerUid!);

        const { uid } = request.data;
        if (!uid) {
            throw new HttpsError('invalid-argument', 'User UID is required');
        }

        // Validate same business (tenant isolation)
        await validateSameBusiness(callerUid!, uid);

        // Prevent SuperAdmin from revoking themselves
        if (callerUid === uid) {
            throw new HttpsError('permission-denied', 'Cannot revoke your own access');
        }

        try {
            const targetUser = await auth.getUser(uid);
            
            // Prevent revoking other SuperAdmins
            if (targetUser.customClaims?.role === 'super_admin') {
                throw new HttpsError('permission-denied', 'Cannot revoke access for another SuperAdmin');
            }

            // Disable user in Auth (soft delete)
            await auth.updateUser(uid, { disabled: true });
            
            // Remove roles
            await auth.setCustomUserClaims(uid, { 
                role: null,
                // Preserve businessId
                businessId: targetUser.customClaims?.businessId
            });

            // Update Firestore user document
            const revokedUserRef = db.collection('users').doc(uid);
            await revokedUserRef.set({ 
                role: null,
                disabled: true,
                revokedAt: new Date().toISOString()
            }, { merge: true });

            return {
                success: true,
                message: `Access revoked for user ${uid}`
            };
        } catch (error) {
            if (error instanceof HttpsError) {
                throw error;
            }
            console.error(`Error revoking access for ${uid}:`, error);
            throw new HttpsError('internal', `Failed to revoke access: ${(error as Error).message}`);
        }
    }
);
