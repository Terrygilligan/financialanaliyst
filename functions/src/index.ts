// functions/src/index.ts

import * as dotenv from 'dotenv';
dotenv.config();

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { processReceiptBatch } from "./processor";
import { ReceiptData } from "./schema";

initializeApp();
const storage = getStorage();
const db = getFirestore();
const auth = getAuth();

export const analyzeReceiptUpload = onObjectFinalized(
    {
        region: "us-central1",
        maxInstances: 5,
        memory: "1GiB",
    },
    async (event) => {
        const file = event.data;
        if (!file || !file.name || !file.bucket) {
            console.error("No file data found in event.");
            return;
        }

        const filePath = file.name;
        const bucketName = file.bucket;

        if (!filePath.startsWith('tenants/')) {
            console.log(`Ignoring file outside the target path: ${filePath}`);
            return;
        }

        console.log(`Starting analysis for file: ${filePath}`);

        try {
            const bucket = storage.bucket(bucketName);
            const [fileBuffer] = await bucket.file(filePath).download();

            const pathParts = filePath.split('/');
            const businessId = pathParts[1];
            const userId = pathParts[3];
            const fileName = pathParts.pop();

            if (!businessId || !userId) {
                console.error(`Could not determine businessId or userId from path: ${filePath}`);
                return;
            }

            const receiptData: ReceiptData = await processReceiptBatch(fileBuffer, filePath);

            await db.collection('businesses').doc(businessId).collection('batches').doc(userId).set({
                status: 'complete',
                lastFileProcessed: fileName,
                receiptData: receiptData,
                timestamp: new Date().toISOString()
            }, { merge: true });

            const userRef = db.collection('businesses').doc(businessId).collection('users').doc(userId);
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

        } catch (e) {
            console.error(`FATAL ERROR processing file ${filePath}:`, e);
            const pathParts = filePath.split('/');
            const businessId = pathParts[1] || 'unknown';
            const userId = pathParts[3] || 'unknown';
            await db.collection('businesses').doc(businessId).collection('batches').doc(userId).set({
                status: 'error',
                errorFile: filePath,
                errorMessage: (e as Error).message,
                timestamp: new Date().toISOString()
            }, { merge: true });
        }
    });

export const setAdminClaim = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const callerUid = request.auth.uid;
        const { targetUserId } = request.data;

        if (!targetUserId) {
            throw new HttpsError('invalid-argument', 'The function must be called with a "targetUserId" argument.');
        }

        try {
            const callerUser = await auth.getUser(callerUid);
            const businessId = callerUser.customClaims?.businessId;

            if (!callerUser.customClaims?.admin || !businessId) {
                throw new HttpsError('permission-denied', 'Only admins can grant admin privileges.');
            }

            const targetUser = await auth.getUser(targetUserId);
            if (targetUser.customClaims?.businessId !== businessId) {
                throw new HttpsError('permission-denied', 'Cannot set admin claim for a user in another business.');
            }

            await auth.setCustomUserClaims(targetUserId, { ...targetUser.customClaims, admin: true });

            return {
                success: true,
                message: `Admin privileges granted to user ${targetUserId}`,
            };
        } catch (e) {
            console.error(`Error setting admin claim for ${targetUserId}:`, e);
            throw new HttpsError('internal', (e as Error).message);
        }
    }
);

export const removeAdminClaim = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const callerUid = request.auth.uid;
        const { targetUserId } = request.data;

        if (!targetUserId) {
            throw new HttpsError('invalid-argument', 'The function must be called with a "targetUserId" argument.');
        }

        try {
            const callerUser = await auth.getUser(callerUid);
            const businessId = callerUser.customClaims?.businessId;

            if (!callerUser.customClaims?.admin || !businessId) {
                throw new HttpsError('permission-denied', 'Only admins can remove admin privileges.');
            }

            const targetUser = await auth.getUser(targetUserId);
            if (targetUser.customClaims?.businessId !== businessId) {
                throw new HttpsError('permission-denied', 'Cannot remove admin claim for a user in another business.');
            }

            await auth.setCustomUserClaims(targetUserId, { ...targetUser.customClaims, admin: false });

            return {
                success: true,
                message: `Admin privileges removed from user ${targetUserId}`,
            };
        } catch (e) {
            console.error(`Error removing admin claim for ${targetUserId}:`, e);
            throw new HttpsError('internal', (e as Error).message);
        }
    }
);

export const setCustomClaims = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const { uid, claims } = request.data;

        if (!uid || !claims) {
            throw new HttpsError('invalid-argument', 'The function must be called with "uid" and "claims" arguments.');
        }

        try {
            await auth.setCustomUserClaims(uid, claims);
            return {
                success: true,
                message: `Custom claims set for user: ${uid}`,
            };
        } catch (e) {
            console.error(`Error setting custom claims for ${uid}:`, e);
            throw new HttpsError('internal', (e as Error).message);
        }
    }
);