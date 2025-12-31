// functions/src/index.ts

// Load environment variables from .env file (for local development)
// In production, these should be set via Secret Manager or runtime config
import * as dotenv from 'dotenv';
dotenv.config();

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
// import * as admin from "firebase-admin";

// Initialize the Firebase Admin SDK once for all functions
initializeApp();
const storage = getStorage();
const db = getFirestore();
const auth = getAuth();

// --- Import the main processor logic ---
import { processReceiptBatch } from "./processor"; 
import { ReceiptData } from "./schema";
import { lookupEntityForUser } from "./entities";
import { convertReceiptToBaseCurrency } from "./currency"; 

/**
 * Helper function to remove undefined values from an object
 * Firestore doesn't accept undefined values, so we need to clean them
 * 
 * @param obj - Object to clean
 * @returns Cleaned object without undefined values
 */
function removeUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
    const cleaned: any = {};
    for (const key in obj) {
        if (obj[key] !== undefined) {
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                // Recursively clean nested objects
                const nestedCleaned = removeUndefinedFields(obj[key]);
                if (Object.keys(nestedCleaned).length > 0) {
                    cleaned[key] = nestedCleaned;
                }
            } else {
                cleaned[key] = obj[key];
            }
        }
    }
    return cleaned;
}

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

    const filePath = file.name; // e.g., tenants/business_001/drivers/user123/receipts/receipt.jpg
    const bucketName = file.bucket; 
    
    console.log(`File uploaded to bucket: ${bucketName}, path: ${filePath}`);
    
    // Support both new tenant-scoped path and legacy path for migration
    const isTenantPath = filePath.startsWith('tenants/');
    const isLegacyPath = filePath.startsWith('receipts/');

    if (!isTenantPath && !isLegacyPath) {
        console.log(`Ignoring file outside the target paths: ${filePath}`);
        return;
    }

    console.log(`Starting analysis for file: ${filePath} (Tenant path: ${isTenantPath})`);

    try {
        // 2. Download the File Buffer from Storage
        const bucket = storage.bucket(bucketName);
        const [fileBuffer] = await bucket.file(filePath).download();
        
        // 3. Extract necessary metadata (businessId, userId, filename)
        let userId: string;
        let businessId: string | null = null;
        let fileName: string;

        if (isTenantPath) {
            // Path format: tenants/{businessId}/drivers/{driverId}/receipts/{filename}
            const pathParts = filePath.split('/');
            businessId = pathParts[1];
            userId = pathParts[3];
            fileName = pathParts.pop() || 'unknown.jpg';
        } else {
            // Legacy path format: receipts/{userId}/{filename}
            const pathParts = filePath.split('/');
            userId = pathParts[1];
            fileName = pathParts.pop() || 'unknown.jpg';
            
            // Try to lookup businessId for legacy user
            const userDoc = await db.collection('users').doc(userId).get();
            businessId = userDoc.exists ? (userDoc.data()?.businessId || null) : null;
        }

        if (!userId) {
            console.error(`Could not determine userId from path: ${filePath}`);
            return;
        }

        // 4. Call the core processor function (defined in processor.ts)
        const receiptData: ReceiptData = await processReceiptBatch(fileBuffer, filePath, businessId || 'global');
        receiptData.processedBy = 'system';
        receiptData.timestamp = new Date().toISOString();

        // 4.5. Look up entity for user within business silo
        const entityName = await lookupEntityForUser(userId, businessId || 'global');
        receiptData.entity = entityName;

        // 4.6. Currency conversion
        const extractedCurrency = receiptData.currency;
        // const baseCurrency = process.env.BASE_CURRENCY || 'GBP';
        
        if (extractedCurrency) {
            const conversionResult = await convertReceiptToBaseCurrency(
                receiptData.totalAmount,
                extractedCurrency
            );

            if (conversionResult) {
                receiptData.originalCurrency = conversionResult.originalCurrency;
                receiptData.originalAmount = conversionResult.originalAmount;
                receiptData.totalAmount = conversionResult.convertedAmount;
                receiptData.exchangeRate = conversionResult.exchangeRate;
                receiptData.conversionDate = conversionResult.conversionDate;
            }
        }

        // 5. Save to Multi-Tenant Silo (Firestore)
        const cleanedReceiptData = removeUndefinedFields(receiptData);
        
        if (businessId) {
            const receiptId = fileName; // Use filename as unique ID (Jules optimization)
            const businessReceiptRef = db.collection('businesses').doc(businessId)
                                         .collection('receipts').doc(receiptId);
            
            await businessReceiptRef.set({
                userId,
                driverId: userId, // Ensure consistency with Jules's schema
                fileName,
                filePath,
                status: 'complete', // Jules uses 'complete'
                ...cleanedReceiptData,
                timestamp: new Date().toISOString(),
                createdAt: FieldValue.serverTimestamp()
            }, { merge: true });
            console.log(`Analysis complete for ${fileName}. Data written to Firestore silo: /businesses/${businessId}/receipts/${receiptId}`);
        }

// Phase 2: Feature Flag - Check if review workflow is enabled
        const enableReviewWorkflow = process.env.ENABLE_REVIEW_WORKFLOW === 'true';
        
        if (enableReviewWorkflow) {
            // New workflow: Store as pending for user review in the silo
            console.log(`Review workflow enabled. Storing receipt as pending for user review.`);
            
            if (businessId) {
                const receiptId = fileName;
                const receiptRef = db.collection('businesses').doc(businessId).collection('receipts').doc(receiptId);
                
                await receiptRef.set({
                    userId,
                    driverId: userId,
                    fileName,
                    filePath,
                    receiptData: cleanedReceiptData,
                    status: 'pending_review',
                    createdAt: FieldValue.serverTimestamp(),
                    timestamp: new Date().toISOString()
                }, { merge: true });
                console.log(`Receipt stored as pending in silo: businesses/${businessId}/receipts/${receiptId}`);
            }
        } else {
            // Default Multi-Tenant Workflow: Finalize statistics within the business silo
            console.log(`Finalizing silo statistics for business: ${businessId}`);
            if (businessId) {
                const businessRef = db.collection('businesses').doc(businessId);
                await db.runTransaction(async (transaction) => {
                    const businessDoc = await transaction.get(businessRef);
                    const currentStats = businessDoc.exists ? (businessDoc.data()?.stats || { totalReceipts: 0, totalAmount: 0 }) : { totalReceipts: 0, totalAmount: 0 };
                    
                    transaction.set(businessRef, {
                        stats: {
                            totalReceipts: (currentStats.totalReceipts || 0) + 1,
                            totalAmount: (currentStats.totalAmount || 0) + (receiptData.totalAmount || 0),
                            lastReceiptAt: new Date().toISOString()
                        }
                    }, { merge: true });
                });
            }
            console.log(`Analysis complete for ${fileName}. Firestore silo statistics updated.`);
        }

    } catch (error) {
        console.error(`FATAL ERROR processing file ${filePath}:`, error);
        
        // Update Firestore status to error (Step 10)
        // Try to determine businessId and userId for correct error logging
        const pathParts = filePath.split('/');
        let businessIdForError: string | null = null;
        let userIdForError: string = 'unknown';
        
        if (filePath.startsWith('tenants/')) {
            businessIdForError = pathParts[1];
            userIdForError = pathParts[3];
        } else if (filePath.startsWith('receipts/')) {
            userIdForError = pathParts[1];
        }

        if (businessIdForError) {
            const receiptId = pathParts.pop() || 'unknown';
            await db.collection('businesses').doc(businessIdForError)
                    .collection('receipts').doc(receiptId).set({
                status: 'error',
                userId: userIdForError,
                driverId: userIdForError,
                errorMessage: (error as Error).message,
                timestamp: new Date().toISOString()
            }, { merge: true });
        } else {
            // Fallback for non-tenant paths (deprecated but kept for absolute safety)
            console.warn(`Logging error to legacy batches collection for path: ${filePath}`);
            await db.collection('batches').doc(userIdForError).set({
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
 * Cloud Function: Invite a new user to a business.
 *
 * This function allows a business admin to create a new user account
 * associated with their business.
 */
export const inviteUserToBusiness = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        // 1. Verify the caller is an admin or bookkeeper.
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const callerUser = await auth.getUser(callerUid);
        const callerClaims = callerUser.customClaims;

        if (!callerClaims?.admin && callerClaims?.role !== 'bookkeeper') {
            throw new HttpsError('permission-denied', 'Only admins or bookkeepers can invite users.');
        }

        // 2. Get the admin's businessId from their custom claims.
        const businessId = callerClaims.businessId;
        if (!businessId) {
            throw new HttpsError('failed-precondition', 'Admin user is not associated with a business.');
        }

        // 3. Get new user data from the request.
        const { email, password, displayName } = request.data;
        if (!email || !password || !displayName) {
            throw new HttpsError('invalid-argument', 'Email, password, and display name are required.');
        }

        try {
            // 4. Create the new user within the specific Auth Tenant (Identity Platform)
            // This ensures physical isolation in the auth layer.
            const tenantAuth = auth.tenantManager().authForTenant(businessId);
            
            const userRecord = await tenantAuth.createUser({
                email,
                password,
                displayName,
                emailVerified: true
            });

            // 5. Set custom claims for the new user (Identity Layer)
            await tenantAuth.setCustomUserClaims(userRecord.uid, {
                businessId: businessId,
                role: 'driver' // Default role for new users
            });

            // 5.5. Create a record in the top-level user_lookup collection
            // This allows unauthenticated password reset flows to find the tenantId
            await db.collection('user_lookup').doc(email.toLowerCase()).set({
                businessId: businessId,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // 6. Create a user profile document in Firestore
            await db.collection('users').doc(userRecord.uid).set({
                email: userRecord.email,
                displayName: userRecord.displayName,
                businessId: businessId,
                role: 'driver',
                createdAt: new Date().toISOString()
            });

            console.log(`Admin ${callerUid} invited new user ${userRecord.uid} to business ${businessId}`);

            return {
                success: true,
                message: `User ${displayName} created successfully with UID: ${userRecord.uid}`,
                uid: userRecord.uid
            };
        } catch (error: any) {
            console.error(`Error inviting user:`, error);
            if (error.code === 'auth/email-already-exists') {
                throw new HttpsError('already-exists', 'A user with this email already exists.');
            }
            throw new HttpsError('internal', error.message || 'An unknown error occurred.');
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

// Phase 5: Identity & User Management
export { createUser, sendPasswordReset } from "./user";

// Automated Business Provisioning - Multi-Tenant SaaS Silo
export {
  provisionNewBusiness,
  getBusinessDetails,
  updateBusinessSettings,
  addAuthorizedUser
} from "./business-management";
