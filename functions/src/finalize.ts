// functions/src/finalize.ts

import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { ReceiptData } from "./schema";
import { appendReceiptToSheet } from "./sheets";

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

            // Ensure required fields are present
            if (!finalReceiptData.vendorName || !finalReceiptData.transactionDate || 
                !finalReceiptData.totalAmount || !finalReceiptData.category) {
                throw new Error("Missing required receipt data fields");
            }

            // 4. Write to Google Sheets
            const sheetId = process.env.GOOGLE_SHEET_ID;
            let sheetsWriteSuccess = false;
            let googleSheetLink = null;

            if (sheetId) {
                try {
                    await appendReceiptToSheet(finalReceiptData, sheetId);
                    console.log(`Receipt data successfully written to Google Sheet: ${sheetId}`);
                    sheetsWriteSuccess = true;
                    googleSheetLink = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
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

            // 6. Update user statistics
            const userRef = db.collection('users').doc(callerUid);
            const userDoc = await userRef.get();
            const currentStats = userDoc.exists ? (userDoc.data() || { totalReceipts: 0, totalAmount: 0 }) : { totalReceipts: 0, totalAmount: 0 };
            
            await userRef.set({
                totalReceipts: (currentStats.totalReceipts || 0) + 1,
                totalAmount: (currentStats.totalAmount || 0) + (finalReceiptData.totalAmount || 0),
                lastUpdated: new Date().toISOString(),
                lastReceiptProcessed: pendingReceipt.fileName,
                lastReceiptTimestamp: new Date().toISOString()
            }, { merge: true });

            // 7. Remove from pending_receipts collection
            await pendingReceiptRef.delete();

            console.log(`Receipt finalized successfully. Receipt ID: ${receiptId}`);

            return {
                success: true,
                message: "Receipt finalized and written to Google Sheets",
                receiptData: finalReceiptData,
                sheetsWriteSuccess: sheetsWriteSuccess,
                googleSheetLink: googleSheetLink
            };
        } catch (error) {
            console.error(`Error finalizing receipt ${receiptId}:`, error);
            throw new Error(`Failed to finalize receipt: ${(error as Error).message}`);
        }
    }
);

