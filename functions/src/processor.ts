// functions/src/processor.ts

import { ReceiptData } from "./schema";
import { extractReceiptData } from "./gemini";

/**
 * Main processor function that orchestrates the receipt analysis workflow.
 * This function will be called by the Cloud Storage trigger.
 * 
 * Steps:
 * 1. Call Gemini API with the image and schema (Step 6)
 * 2. Parse and validate the JSON response (Step 7)
 * 3. Add timestamp (handled by extractReceiptData)
 * 4. Return the structured ReceiptData
 * 
 * @param fileBuffer - The binary content of the uploaded receipt image
 * @param filePath - The storage path of the file (e.g., receipts/user123/receipt.jpg)
 * @returns Promise<ReceiptData> - The extracted and validated receipt data
 * @throws Error if processing fails at any step
 */
export async function processReceiptBatch(
    fileBuffer: Buffer,
    filePath: string
): Promise<ReceiptData> {
    console.log(`Processing receipt: ${filePath} (${fileBuffer.length} bytes)`);

    // Validate file buffer
    if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("File buffer is empty or invalid");
    }

    // Validate file size (max 20MB for Gemini API)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (fileBuffer.length > maxSize) {
        throw new Error(`File size (${fileBuffer.length} bytes) exceeds maximum allowed size (${maxSize} bytes)`);
    }

    try {
        // Step 6 & 7: Call Gemini API and get validated structured data
        // The extractReceiptData function handles:
        // - Gemini API call with image
        // - JSON parsing and extraction
        // - Data validation
        // - Category normalization
        // - Timestamp addition
        const receiptData = await extractReceiptData(fileBuffer, filePath);

        // Additional validation
        if (!receiptData.vendorName || receiptData.vendorName.trim().length === 0) {
            throw new Error("Vendor name is required but was not extracted");
        }

        if (receiptData.totalAmount <= 0) {
            throw new Error(`Invalid total amount: ${receiptData.totalAmount}`);
        }

        console.log(`Successfully extracted receipt data:`, {
            vendor: receiptData.vendorName,
            date: receiptData.transactionDate,
            amount: receiptData.totalAmount,
            category: receiptData.category
        });

        return receiptData;

    } catch (error) {
        console.error(`Error processing receipt ${filePath}:`, error);
        throw new Error(
            `Failed to process receipt: ${(error as Error).message}`
        );
    }
}
