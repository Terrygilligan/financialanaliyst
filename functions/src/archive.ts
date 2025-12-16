// functions/src/archive.ts

import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const db = getFirestore();
const auth = getAuth();

/**
 * Archive old receipt data to reduce Firestore storage costs.
 * 
 * This function moves old receipt data from the active collections to an archive collection.
 * Only admins can call this function.
 * 
 * @param request.data.archiveBefore - ISO date string. Archive receipts older than this date.
 * @param request.data.dryRun - If true, only show what would be archived without actually archiving.
 * @returns Summary of archived data
 */
export const archiveData = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        // Verify caller is authenticated and is admin
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new Error("Unauthorized: Authentication required");
        }

        try {
            const caller = await auth.getUser(callerUid);
            if (!caller.customClaims?.admin) {
                throw new Error("Unauthorized: Admin privileges required");
            }
        } catch (error) {
            throw new Error("Unauthorized: Admin privileges required");
        }

        const { archiveBefore, dryRun = false } = request.data || {};

        if (!archiveBefore) {
            throw new Error("archiveBefore date is required (ISO format)");
        }

        const archiveDate = new Date(archiveBefore);
        if (isNaN(archiveDate.getTime())) {
            throw new Error("Invalid date format. Use ISO format (e.g., '2024-01-01T00:00:00Z')");
        }

        console.log(`Starting archive process. Archive before: ${archiveDate.toISOString()}, Dry run: ${dryRun}`);

        const archiveSummary = {
            archivedBatches: 0,
            archivedReceipts: 0,
            errors: [] as string[],
            dryRun
        };

        try {
            // Archive old batches
            const batchesSnapshot = await db.collection('batches').get();
            let currentBatch = db.batch();
            let batchCount = 0;

            // Use for...of instead of forEach to properly handle async operations
            for (const doc of batchesSnapshot.docs) {
                const data = doc.data();
                const timestamp = data.timestamp ? new Date(data.timestamp) : null;

                if (timestamp && timestamp < archiveDate) {
                    if (!dryRun) {
                        // Move to archive collection
                        const archiveRef = db.collection('archive_batches').doc(doc.id);
                        currentBatch.set(archiveRef, {
                            ...data,
                            archivedAt: new Date().toISOString(),
                            archivedBy: callerUid
                        });

                        // Delete from active collection
                        currentBatch.delete(doc.ref);
                    }
                    archiveSummary.archivedBatches++;
                    batchCount++;

                    // Commit in batches of 500 (Firestore limit)
                    if (batchCount >= 500) {
                        if (!dryRun) {
                            await currentBatch.commit();
                            // Create a new batch for the next set of operations
                            currentBatch = db.batch();
                        }
                        batchCount = 0;
                    }
                }
            }

            // Commit remaining batches
            if (batchCount > 0 && !dryRun) {
                await currentBatch.commit();
            }

            // Archive old receipts (if /receipts collection exists)
            try {
                const receiptsSnapshot = await db.collection('receipts').get();
                let currentReceiptBatch = db.batch();
                let receiptCount = 0;

                // Use for...of instead of forEach to properly handle async operations
                for (const doc of receiptsSnapshot.docs) {
                    const data = doc.data();
                    const createdAt = data.createdAt ? new Date(data.createdAt) : null;

                    if (createdAt && createdAt < archiveDate) {
                        if (!dryRun) {
                            // Move to archive collection
                            const archiveRef = db.collection('archive_receipts').doc(doc.id);
                            currentReceiptBatch.set(archiveRef, {
                                ...data,
                                archivedAt: new Date().toISOString(),
                                archivedBy: callerUid
                            });

                            // Delete from active collection
                            currentReceiptBatch.delete(doc.ref);
                        }
                        archiveSummary.archivedReceipts++;
                        receiptCount++;

                        // Commit in batches of 500
                        if (receiptCount >= 500) {
                            if (!dryRun) {
                                await currentReceiptBatch.commit();
                                // Create a new batch for the next set of operations
                                currentReceiptBatch = db.batch();
                            }
                            receiptCount = 0;
                        }
                    }
                }

                // Commit remaining receipts
                if (receiptCount > 0 && !dryRun) {
                    await currentReceiptBatch.commit();
                }
            } catch (error) {
                // /receipts collection might not exist yet, that's okay
                console.log('Receipts collection not found or empty, skipping receipt archiving');
            }

            console.log(`Archive process complete. Summary:`, archiveSummary);

            return {
                success: true,
                summary: archiveSummary,
                message: dryRun 
                    ? `Dry run complete. Would archive ${archiveSummary.archivedBatches} batches and ${archiveSummary.archivedReceipts} receipts.`
                    : `Archived ${archiveSummary.archivedBatches} batches and ${archiveSummary.archivedReceipts} receipts.`
            };
        } catch (error) {
            console.error('Error during archive process:', error);
            throw new Error(`Archive failed: ${(error as Error).message}`);
        }
    }
);

