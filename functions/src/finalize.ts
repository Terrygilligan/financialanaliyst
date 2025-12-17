// functions/src/finalize.ts

import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { ReceiptData } from "./schema";
import { appendReceiptToSheet, appendToAccountantSheet } from "./sheets";
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

        try {
            // 1. Get the pending receipt
            const pendingReceiptRef = db.collection('pending_receipts').doc(receiptId);
            const pendingReceiptDoc = await pendingReceiptRef.get();

            if (!pendingReceiptDoc.exists) {
                throw new Error("Pending receipt not found");
            }

            const pendingReceipt = pendingReceiptDoc.data();
            
            // 2. Verify user owns this receipt
            if (pendingReceipt?.userId !== callerUid) {
                throw new Error("Unauthorized: You can only finalize your own receipts");
            }

            // 3. Merge user corrections with original data
            const finalReceiptData: ReceiptData = {
                ...(pendingReceipt.receiptData as ReceiptData),
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
                
                // Store receipt in needs_admin_review status (keep in pending_receipts collection)
                await db.collection('pending_receipts').doc(receiptId).update({
                    status: 'needs_admin_review',
                    validationErrors: validation.errors,
                    validationWarnings: validation.warnings,
                    reviewRequestedAt: new Date().toISOString()
                });

                // Update batches collection
                await db.collection('batches').doc(callerUid).set({
                    status: 'needs_admin_review',
                    validationErrors: validation.errors,
                    timestamp: new Date().toISOString()
                }, { merge: true });

                // Update user statistics using transaction to prevent race conditions
                // Decrement pendingReceipts to keep stats accurate
                const userRef = db.collection('users').doc(callerUid);
                await db.runTransaction(async (transaction) => {
                    const userDoc = await transaction.get(userRef);
                    const currentStats = userDoc.exists ? (userDoc.data() || { pendingReceipts: 0 }) : { pendingReceipts: 0 };
                    
                    transaction.set(userRef, {
                        pendingReceipts: Math.max(0, (currentStats.pendingReceipts || 0) - 1),
                        lastUpdated: new Date().toISOString()
                    }, { merge: true });
                });

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

            // 4. Write to Google Sheets
            const sheetId = process.env.GOOGLE_SHEET_ID;
            let sheetsWriteSuccess = false;
            let googleSheetLink = null;

            if (sheetId) {
                try {
                    // Write to main sheet
                    await appendReceiptToSheet(finalReceiptData, sheetId);
                    console.log(`Receipt data successfully written to Google Sheet: ${sheetId}`);
                    sheetsWriteSuccess = true;
                    googleSheetLink = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
                    
                    // Phase 3.2: Also write to accountant CSV tab (non-blocking)
                    try {
                        await appendToAccountantSheet(finalReceiptData, sheetId);
                        console.log(`Receipt data also written to Accountant_CSV_Ready tab`);
                    } catch (accountantError) {
                        console.warn(`Failed to write to Accountant_CSV_Ready tab (non-critical): ${(accountantError as Error).message}`);
                        // Don't fail the whole operation if accountant tab fails
                    }
                } catch (sheetsError) {
                    console.error(`Failed to write to Google Sheet: ${(sheetsError as Error).message}`);
                    // Don't fail the entire operation if Sheets write fails
                }
            }

            // 5. Update batches collection with final status
            await db.collection('batches').doc(callerUid).set({
                status: 'complete',
                lastFileProcessed: pendingReceipt.fileName,
                receiptData: finalReceiptData,
                sheetsWriteSuccess: sheetsWriteSuccess,
                googleSheetLink: googleSheetLink,
                finalizedAt: new Date().toISOString(),
                timestamp: new Date().toISOString()
            }, { merge: true });

            // 6. Update user statistics using transaction to prevent race conditions
            const userRef = db.collection('users').doc(callerUid);
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const currentStats = userDoc.exists ? (userDoc.data() || { totalReceipts: 0, totalAmount: 0, pendingReceipts: 0 }) : { totalReceipts: 0, totalAmount: 0, pendingReceipts: 0 };
                
                transaction.set(userRef, {
                    totalReceipts: (currentStats.totalReceipts || 0) + 1,
                    totalAmount: (currentStats.totalAmount || 0) + (finalReceiptData.totalAmount || 0),
                    pendingReceipts: Math.max(0, (currentStats.pendingReceipts || 0) - 1), // Decrement pending count
                    lastUpdated: new Date().toISOString(),
                    lastReceiptProcessed: pendingReceipt.fileName,
                    lastReceiptTimestamp: new Date().toISOString()
                }, { merge: true });
            });

            // 7. Remove from pending_receipts collection
            await pendingReceiptRef.delete();

            console.log(`Receipt finalized successfully. Receipt ID: ${receiptId}`);

            // Phase 3.3: Log successful finalization
            await logInfo('finalizeReceipt', `Receipt finalized successfully: ${receiptId}`, {
                receiptId,
                userId: callerUid,
                fileName: pendingReceipt.fileName,
                validationStatus: finalReceiptData.validationStatus
            });

            return {
                success: true,
                message: "Receipt finalized and written to Google Sheets",
                receiptData: finalReceiptData,
                sheetsWriteSuccess: sheetsWriteSuccess,
                googleSheetLink: googleSheetLink
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

