// functions/src/admin-review.ts

import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { ReceiptData } from "./schema";
import { appendReceiptToSheet, appendToAccountantSheet } from "./sheets";
import { validateReceiptData } from "./validation";
import { logInfo, logWarning, logErrorWithDetails } from "./error-logging";

const db = getFirestore();
const auth = getAuth();

/**
 * Admin approve receipt (override validation).
 * 
 * Allows admins to manually approve receipts that failed validation.
 * Writes to Google Sheets and updates user statistics.
 * 
 * @param request.data.receiptId - The ID of the pending receipt
 * @param request.data.receiptData - Corrected receipt data
 * @param request.data.adminNotes - Admin notes about the approval
 * @returns Success status
 */
export const adminApproveReceipt = onCall(
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
            if (error instanceof Error && error.message === "Unauthorized: Admin privileges required") {
                throw error;
            }
            console.error("Error verifying admin status:", error);
            throw new Error(`Failed to verify admin status: ${(error as Error).message}`);
        }

        const { receiptId, receiptData: updatedReceiptData, adminNotes } = request.data || {};

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
            const userId = pendingReceipt?.userId;

            if (!userId) {
                throw new Error("Receipt does not have an associated user");
            }

            // 2. Merge admin corrections with original Gemini data
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

            // Ensure timestamp is set
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
                // If exchangeRate was undefined, set it to 1.0 for consistency
                if (finalReceiptData.exchangeRate === undefined) {
                    finalReceiptData.exchangeRate = 1.0;
                }
            }

            // 2.5. Validate merged receipt data (admin corrections + original data)
            // Ensure required fields are present
            if (!finalReceiptData.vendorName || !finalReceiptData.transactionDate || 
                finalReceiptData.totalAmount == null || typeof finalReceiptData.totalAmount !== 'number' ||
                !finalReceiptData.category || !finalReceiptData.timestamp) {
                throw new Error("Invalid receipt data after admin corrections: Missing required fields (vendorName, transactionDate, totalAmount, category, timestamp)");
            }

            // Validate receipt data quality (same validation as finalizeReceipt)
            const validation = validateReceiptData({
                vendorName: finalReceiptData.vendorName,
                transactionDate: finalReceiptData.transactionDate,
                totalAmount: finalReceiptData.totalAmount,
                category: String(finalReceiptData.category), // Convert enum to string
                vatNumber: finalReceiptData.supplierVatNumber
            });

            // Log validation issues (but allow admin override)
            if (!validation.isValid) {
                console.warn(`Admin override: Receipt ${receiptId} has validation errors:`, validation.errors);
                console.warn(`Admin ${callerUid} is approving despite validation failures.`);
                
                // Phase 3.3: Log admin override
                await logWarning('adminApproveReceipt', `Admin override: Approving receipt with validation errors`, {
                    receiptId,
                    adminId: callerUid,
                    userId,
                    errors: validation.errors
                });
            }
            if (validation.warnings.length > 0) {
                console.log(`Admin approval: Receipt ${receiptId} has validation warnings:`, validation.warnings);
            }

            // Phase 3.3: Set audit trail fields
            finalReceiptData.processedBy = 'admin';
            finalReceiptData.validationStatus = !validation.isValid ? 'admin_override' : validation.warnings.length > 0 ? 'warning' : 'passed';
            finalReceiptData.hasErrors = false;

            // 3. Write to Google Sheets
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

            // 4. Update batches collection with final status
            await db.collection('batches').doc(userId).set({
                status: 'complete',
                lastFileProcessed: pendingReceipt.fileName,
                receiptData: finalReceiptData,
                sheetsWriteSuccess: sheetsWriteSuccess,
                googleSheetLink: googleSheetLink,
                adminApproved: true,
                approvedBy: callerUid,
                approvedAt: new Date().toISOString(),
                adminNotes: adminNotes || '',
                timestamp: new Date().toISOString()
            }, { merge: true });

            // 5. Update user statistics using transaction to prevent race conditions
            const userRef = db.collection('users').doc(userId);
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const currentStats = userDoc.exists ? (userDoc.data() || { totalReceipts: 0, totalAmount: 0, pendingReceipts: 0 }) : { totalReceipts: 0, totalAmount: 0, pendingReceipts: 0 };
                
                transaction.set(userRef, {
                    totalReceipts: (currentStats.totalReceipts || 0) + 1,
                    totalAmount: (currentStats.totalAmount || 0) + (finalReceiptData.totalAmount || 0),
                    pendingReceipts: Math.max(0, (currentStats.pendingReceipts || 0) - 1),
                    lastUpdated: new Date().toISOString(),
                    lastReceiptProcessed: pendingReceipt.fileName,
                    lastReceiptTimestamp: new Date().toISOString()
                }, { merge: true });
            });

            // 6. Remove from pending_receipts collection
            await pendingReceiptRef.delete();

            console.log(`Receipt approved by admin ${callerUid}. Receipt ID: ${receiptId}`);

            // Phase 3.3: Log admin approval
            await logInfo('adminApproveReceipt', `Receipt approved by admin: ${receiptId}`, {
                receiptId,
                adminId: callerUid,
                userId,
                fileName: pendingReceipt.fileName,
                validationStatus: finalReceiptData.validationStatus,
                adminNotes: adminNotes || ''
            });

            return {
                success: true,
                message: "Receipt approved and finalized",
                receiptData: finalReceiptData,
                sheetsWriteSuccess: sheetsWriteSuccess,
                googleSheetLink: googleSheetLink
            };
        } catch (error) {
            console.error(`Error approving receipt ${receiptId}:`, error);
            
            // Phase 3.3: Log error
            await logErrorWithDetails('adminApproveReceipt', error as Error, {
                receiptId,
                adminId: callerUid
            });
            
            throw new Error(`Failed to approve receipt: ${(error as Error).message}`);
        }
    }
);

/**
 * Admin reject receipt.
 * 
 * Allows admins to reject receipts that cannot be processed.
 * Moves to rejected collection for record keeping.
 * 
 * @param request.data.receiptId - The ID of the pending receipt
 * @param request.data.adminNotes - Admin notes about the rejection (required)
 * @returns Success status
 */
export const adminRejectReceipt = onCall(
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
            if (error instanceof Error && error.message === "Unauthorized: Admin privileges required") {
                throw error;
            }
            console.error("Error verifying admin status:", error);
            throw new Error(`Failed to verify admin status: ${(error as Error).message}`);
        }

        const { receiptId, adminNotes } = request.data || {};

        if (!receiptId) {
            throw new Error("receiptId is required");
        }

        if (!adminNotes || adminNotes.trim() === '') {
            throw new Error("adminNotes is required for rejection");
        }

        try {
            // 1. Get the pending receipt
            const pendingReceiptRef = db.collection('pending_receipts').doc(receiptId);
            const pendingReceiptDoc = await pendingReceiptRef.get();

            if (!pendingReceiptDoc.exists) {
                throw new Error("Pending receipt not found");
            }

            const pendingReceipt = pendingReceiptDoc.data();
            const userId = pendingReceipt?.userId;

            if (!userId) {
                throw new Error("Receipt does not have an associated user");
            }

            // 2. Move to rejected_receipts collection for record keeping
            await db.collection('rejected_receipts').doc(receiptId).set({
                ...pendingReceipt,
                status: 'rejected',
                rejectedBy: callerUid,
                rejectedAt: new Date().toISOString(),
                adminNotes: adminNotes
            });

            // 3. Update batches collection
            await db.collection('batches').doc(userId).set({
                status: 'rejected',
                lastFileProcessed: pendingReceipt.fileName,
                rejectedBy: callerUid,
                rejectedAt: new Date().toISOString(),
                adminNotes: adminNotes,
                timestamp: new Date().toISOString()
            }, { merge: true });

            // 4. Update user statistics using transaction to prevent race conditions
            const userRef = db.collection('users').doc(userId);
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const currentStats = userDoc.exists ? (userDoc.data() || { pendingReceipts: 0 }) : { pendingReceipts: 0 };
                
                transaction.set(userRef, {
                    pendingReceipts: Math.max(0, (currentStats.pendingReceipts || 0) - 1),
                    lastUpdated: new Date().toISOString()
                }, { merge: true });
            });

            // 5. Remove from pending_receipts collection
            await pendingReceiptRef.delete();

            console.log(`Receipt rejected by admin ${callerUid}. Receipt ID: ${receiptId}. Reason: ${adminNotes}`);

            // Phase 3.3: Log admin rejection
            await logInfo('adminRejectReceipt', `Receipt rejected by admin: ${receiptId}`, {
                receiptId,
                adminId: callerUid,
                userId,
                fileName: pendingReceipt.fileName,
                reason: adminNotes
            });

            return {
                success: true,
                message: "Receipt rejected",
                receiptId: receiptId
            };
        } catch (error) {
            console.error(`Error rejecting receipt ${receiptId}:`, error);
            
            // Phase 3.3: Log error
            await logErrorWithDetails('adminRejectReceipt', error as Error, {
                receiptId,
                adminId: callerUid
            });
            
            throw new Error(`Failed to reject receipt: ${(error as Error).message}`);
        }
    }
);

