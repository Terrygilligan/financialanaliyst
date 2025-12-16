// functions/src/archive.ts

import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const db = getFirestore();
const auth = getAuth();

/**
 * Archive old receipt data to reduce Firestore storage costs.
 * 
 * This function moves old batch data (which contains receipt data) from the active
 * /batches collection to the /archive_batches collection. Receipt data is embedded
 * in batches, so archiving batches also archives the receipt information.
 * 
 * Only admins can call this function.
 * 
 * @param request.data.archiveBefore - ISO date string. Archive batches older than this date.
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
            // Re-throw authorization errors as-is
            if (error instanceof Error && error.message === "Unauthorized: Admin privileges required") {
                throw error;
            }
            // For other errors (network, auth service issues, etc.), preserve the original error
            console.error("Error verifying admin status:", error);
            throw new Error(`Failed to verify admin status: ${(error as Error).message}`);
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
            errors: [] as string[],
            dryRun
        };

        try {
            // Archive old batches
            const batchesSnapshot = await db.collection('batches').get();
            let currentBatch = db.batch();
            let operationCount = 0; // Track operations, not documents (each doc = 2 ops: set + delete)
            const MAX_BATCH_OPERATIONS = 500; // Firestore batch limit

            // Use for...of instead of forEach to properly handle async operations
            for (const doc of batchesSnapshot.docs) {
                const data = doc.data();
                const timestamp = data.timestamp ? new Date(data.timestamp) : null;

                if (timestamp && timestamp < archiveDate) {
                    if (!dryRun) {
                        // Move to archive collection (operation 1)
                        const archiveRef = db.collection('archive_batches').doc(doc.id);
                        currentBatch.set(archiveRef, {
                            ...data,
                            archivedAt: new Date().toISOString(),
                            archivedBy: callerUid
                        });

                        // Delete from active collection (operation 2)
                        currentBatch.delete(doc.ref);
                        operationCount += 2; // Each document = 2 operations
                    }
                    archiveSummary.archivedBatches++;

                    // Commit when approaching Firestore's 500-operation limit
                    // We commit at 500 to stay within limit (each doc = 2 ops, so 250 docs max)
                    if (operationCount >= MAX_BATCH_OPERATIONS) {
                        if (!dryRun) {
                            await currentBatch.commit();
                            // Create a new batch for the next set of operations
                            currentBatch = db.batch();
                        }
                        operationCount = 0;
                    }
                }
            }

            // Commit remaining batches
            if (operationCount > 0 && !dryRun) {
                await currentBatch.commit();
            }

            // Note: Receipts are stored in /batches/{userId} with receiptData embedded,
            // so archiving batches also archives the receipt data. A separate /receipts
            // collection does not exist in the current implementation. If individual
            // receipt archiving is needed in the future, receipts should first be stored
            // in a dedicated /receipts collection.

            console.log(`Archive process complete. Summary:`, archiveSummary);

            return {
                success: true,
                summary: archiveSummary,
                message: dryRun 
                    ? `Dry run complete. Would archive ${archiveSummary.archivedBatches} batches (receipt data is embedded in batches).`
                    : `Archived ${archiveSummary.archivedBatches} batches (receipt data is embedded in batches).`
            };
        } catch (error) {
            console.error('Error during archive process:', error);
            throw new Error(`Archive failed: ${(error as Error).message}`);
        }
    }
);

