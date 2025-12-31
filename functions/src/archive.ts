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

        const { archiveBefore, dryRun = false, businessId: targetBusinessId } = request.data || {};

        if (!archiveBefore) {
            throw new Error("archiveBefore date is required (ISO format)");
        }

        // Get businessId from admin's auth token (The Silo Rule)
        const businessId = targetBusinessId || request.auth?.token?.businessId;
        if (!businessId) {
            throw new Error("Unauthorized: Admin not associated with a business silo");
        }

        const archiveDate = new Date(archiveBefore);
        if (isNaN(archiveDate.getTime())) {
            throw new Error("Invalid date format. Use ISO format (e.g., '2024-01-01T00:00:00Z')");
        }

        console.log(`Starting archive process for silo ${businessId}. Archive before: ${archiveDate.toISOString()}, Dry run: ${dryRun}`);

        const archiveSummary = {
            archivedReceipts: 0,
            errors: [] as string[],
            dryRun
        };

        try {
            // Archive old receipts from the business silo
            const receiptsSnapshot = await db.collection('businesses').doc(businessId)
                                             .collection('receipts')
                                             .where('timestamp', '<', archiveDate.toISOString())
                                             .get();
            
            let currentBatch = db.batch();
            let operationCount = 0;
            const MAX_BATCH_OPERATIONS = 500;

            for (const doc of receiptsSnapshot.docs) {
                if (!dryRun) {
                    // Move to archive collection within silo
                    const archiveRef = db.collection('businesses').doc(businessId)
                                         .collection('archive_receipts').doc(doc.id);
                    currentBatch.set(archiveRef, {
                        ...doc.data(),
                        archivedAt: new Date().toISOString(),
                        archivedBy: callerUid
                    });

                    // Delete from active collection
                    currentBatch.delete(doc.ref);
                    operationCount += 2;
                }
                archiveSummary.archivedReceipts++;

                if (operationCount >= MAX_BATCH_OPERATIONS) {
                    if (!dryRun) {
                        await currentBatch.commit();
                        currentBatch = db.batch();
                    }
                    operationCount = 0;
                }
            }

            if (operationCount > 0 && !dryRun) {
                await currentBatch.commit();
            }

            console.log(`Archive process complete for silo ${businessId}. Summary:`, archiveSummary);

            return {
                success: true,
                summary: archiveSummary,
                message: dryRun 
                    ? `Dry run complete. Would archive ${archiveSummary.archivedReceipts} receipts in silo ${businessId}.`
                    : `Archived ${archiveSummary.archivedReceipts} receipts in silo ${businessId}.`
            };
        } catch (error) {
            console.error('Error during archive process:', error);
            throw new Error(`Archive failed: ${(error as Error).message}`);
        }
    }
);

