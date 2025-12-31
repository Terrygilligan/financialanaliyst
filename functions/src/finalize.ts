// functions/src/finalize.ts

import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { ReceiptData } from "./schema";
import { validateReceiptData } from "./validation";
import { logInfo, logWarning, logErrorWithDetails } from "./error-logging";

const db = getFirestore();

/**
 * Finalize a pending receipt after user review and approval.
 * 
 * This function:
 * 1. Validates the user owns the receipt
 * 2. Updates receipt data with user corrections (if any)
 * 3. Writes to Google Sheets
 * 4. Updates Firestore status
 * 5. Updates user statistics
 * 6. Removes from pending_receipts collection
 * 
 * @param request.data.receiptId - The ID of the pending receipt
 * @param request.data.receiptData - Updated receipt data (optional corrections)
 * @returns Success status
 */
export const finalizeReceipt = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        // Verify caller is authenticated
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new Error("Unauthorized: Authentication required");
        }

        const { receiptId, receiptData: updatedReceiptData } = request.data || {};

        if (!receiptId) {
            throw new Error("receiptId is required");
        }

        // Get businessId from auth token (The Silo Rule)
        const businessId = request.auth?.token?.businessId;
        if (!businessId) {
            throw new Error("Unauthorized: No business association found");
        }

        try {
            // 1. Get the pending receipt from the business silo
            const pendingReceiptRef = db.collection('businesses').doc(businessId)
                                         .collection('receipts').doc(receiptId);
            const pendingReceiptDoc = await pendingReceiptRef.get();

            if (!pendingReceiptDoc.exists) {
                throw new Error("Pending receipt not found in your business silo");
            }

            const pendingReceipt = pendingReceiptDoc.data();
            
            // 2. Verify user context matches (optional but recommended for Jules)
            if (pendingReceipt?.driverId !== callerUid && pendingReceipt?.userId !== callerUid) {
                throw new Error("Unauthorized: You can only finalize receipts within your context");
            }

            // 3. Merge user corrections with original Gemini data
            // Bug Fix: Validate that receiptData exists before attempting to merge
            if (!pendingReceipt.receiptData) {
                throw new Error(
                    `Receipt ${receiptId} is missing receiptData field. The pending receipt document may be corrupt.`
                );
            }
            
            const originalReceiptData = pendingReceipt.receiptData as ReceiptData;
            
            const finalReceiptData: ReceiptData = {
                ...originalReceiptData,
                ...(updatedReceiptData || {})
            };

            // Ensure timestamp is set (preserve original or set new one if missing)
            if (!finalReceiptData.timestamp) {
                finalReceiptData.timestamp = new Date().toISOString();
            }

            // Bug Fix: Ensure currency defaults are set if missing (in case Gemini failed to extract)
            const baseCurrency = process.env.BASE_CURRENCY || 'GBP';
            if (!finalReceiptData.currency) {
                console.log(`Currency missing in receipt ${receiptId}, applying defaults: ${baseCurrency}`);
                finalReceiptData.currency = baseCurrency;
                finalReceiptData.originalCurrency = baseCurrency;
                finalReceiptData.originalAmount = finalReceiptData.totalAmount;
                finalReceiptData.exchangeRate = 1.0;
                finalReceiptData.conversionDate = new Date().toISOString();
            }

            // Bug Fix: Maintain semantic invariant whenever exchangeRate=1.0 OR undefined (no conversion)
            // Invariant: originalAmount * exchangeRate ≈ totalAmount
            // When exchangeRate=1.0 (or missing/undefined) and user/admin corrected totalAmount, update originalAmount to match
            // Treat undefined/missing exchangeRate as 1.0 (no conversion scenario)
            if (finalReceiptData.exchangeRate === 1.0 || finalReceiptData.exchangeRate === undefined) {
                console.log(`Enforcing semantic invariant for receipt ${receiptId}: originalAmount must equal totalAmount when exchangeRate=1.0 or undefined`);
                finalReceiptData.originalAmount = finalReceiptData.totalAmount;
                // If exchangeRate was undefined, set it to 1.0 and initialize originalCurrency for data integrity
                if (finalReceiptData.exchangeRate === undefined) {
                    finalReceiptData.exchangeRate = 1.0;
                    // Bug Fix: Set originalCurrency to maintain complete currency metadata
                    if (!finalReceiptData.originalCurrency) {
                        finalReceiptData.originalCurrency = finalReceiptData.currency || baseCurrency;
                    }
                }
            }

            // Ensure required fields are present
            // Note: Use == null to check for null/undefined (allows 0 for totalAmount)
            if (!finalReceiptData.vendorName || !finalReceiptData.transactionDate || 
                finalReceiptData.totalAmount == null || typeof finalReceiptData.totalAmount !== 'number' ||
                !finalReceiptData.category || !finalReceiptData.timestamp) {
                throw new Error("Missing required receipt data fields: vendorName, transactionDate, totalAmount, category, and timestamp are required");
            }

            // Phase 2.5: Validate receipt data
            // Convert enum to string for validation function
            const validation = validateReceiptData({
                vendorName: finalReceiptData.vendorName,
                transactionDate: finalReceiptData.transactionDate,
                totalAmount: finalReceiptData.totalAmount,
                category: String(finalReceiptData.category), // Convert enum to string
                vatNumber: finalReceiptData.supplierVatNumber // Use merged VAT number from final data
            });

            // If validation fails, mark for admin review instead of rejecting
            if (!validation.isValid) {
                console.warn(`Receipt validation failed for ${receiptId}:`, validation.errors);
                
                // Phase 3.3: Log validation failure
                await logWarning('finalizeReceipt', `Receipt validation failed for ${receiptId}`, {
                    receiptId,
                    userId: callerUid,
                    errors: validation.errors,
                    warnings: validation.warnings
                });
                
                // Store receipt in needs_admin_review status (remains in business silo)
                await pendingReceiptRef.update({
                    status: 'needs_admin_review',
                    validationErrors: validation.errors,
                    validationWarnings: validation.warnings,
                    reviewRequestedAt: new Date().toISOString()
                });

                // Update business silo activity log (replacing deprecated batches)
                await db.collection('businesses').doc(businessId).collection('activity').doc(callerUid).set({
                    lastAction: 'validation_failure',
                    status: 'needs_admin_review',
                    validationErrors: validation.errors,
                    timestamp: new Date().toISOString()
                }, { merge: true });

                // Bug Fix: Do NOT decrement pendingReceipts here
                // The receipt is still pending (just flagged for admin review)
                // The counter will be decremented when the admin approves/rejects it

                return {
                    success: false,
                    needsAdminReview: true,
                    message: "Receipt requires admin review due to validation errors",
                    errors: validation.errors,
                    warnings: validation.warnings
                };
            }

            // Log warnings if any (but continue processing)
            if (validation.warnings.length > 0) {
                console.log(`Receipt validation warnings for ${receiptId}:`, validation.warnings);
                // Phase 3.3: Log validation warnings
                await logWarning('finalizeReceipt', `Receipt has validation warnings for ${receiptId}`, {
                    receiptId,
                    userId: callerUid,
                    warnings: validation.warnings
                });
            }

            // Phase 3.3: Set audit trail fields
            finalReceiptData.processedBy = 'user';
            finalReceiptData.validationStatus = validation.warnings.length > 0 ? 'warning' : 'passed';
            finalReceiptData.hasErrors = false;

            // 5. Update business silo activity with final status
            await db.collection('businesses').doc(businessId).collection('activity').doc(callerUid).set({
                lastAction: 'receipt_finalized',
                status: 'complete',
                lastFileProcessed: pendingReceipt.fileName,
                receiptData: finalReceiptData,
                finalizedAt: new Date().toISOString(),
                timestamp: new Date().toISOString()
            }, { merge: true });

            // 6. Update business statistics using transaction (The Silo Rule)
            const businessRef = db.collection('businesses').doc(businessId);
            await db.runTransaction(async (transaction) => {
                const businessDoc = await transaction.get(businessRef);
                const currentStats = businessDoc.exists ? (businessDoc.data()?.stats || { totalReceipts: 0, totalAmount: 0 }) : { totalReceipts: 0, totalAmount: 0 };
                
                transaction.set(businessRef, {
                    stats: {
                        totalReceipts: (currentStats.totalReceipts || 0) + 1,
                        totalAmount: (currentStats.totalAmount || 0) + (finalReceiptData.totalAmount || 0),
                        lastReceiptAt: new Date().toISOString()
                    }
                }, { merge: true });
            });

            // 7. Mark as complete in silo (don't delete, just update status)
            await pendingReceiptRef.update({
                status: 'complete',
                ...finalReceiptData,
                finalizedAt: new Date().toISOString()
            });

            console.log(`Receipt finalized successfully in silo. Receipt ID: ${receiptId}`);

            // Phase 3.3: Log successful finalization
            await logInfo('finalizeReceipt', `Receipt finalized successfully: ${receiptId}`, {
                receiptId,
                userId: callerUid,
                fileName: pendingReceipt.fileName,
                validationStatus: finalReceiptData.validationStatus
            });

            return {
                success: true,
                message: "Receipt finalized",
                receiptData: finalReceiptData
            };
        } catch (error) {
            console.error(`Error finalizing receipt ${receiptId}:`, error);
            
            // Phase 3.3: Log error
            await logErrorWithDetails('finalizeReceipt', error as Error, {
                receiptId,
                userId: callerUid
            });
            
            throw new Error(`Failed to finalize receipt: ${(error as Error).message}`);
        }
    }
);

