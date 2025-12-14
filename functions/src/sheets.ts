// functions/src/sheets.ts

import { google } from "googleapis";
import { ReceiptData } from "./schema";

/**
 * Initialize Google Sheets API client using Service Account credentials.
 * The Service Account JSON key should be provided via environment variable.
 */
function getSheetsClient() {
    const serviceAccountKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
        throw new Error(
            "GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY environment variable is not set. " +
            "Please provide the Service Account JSON key as a string."
        );
    }

    let credentials;
    try {
        // Parse the JSON key (could be a JSON string or already parsed)
        credentials = typeof serviceAccountKey === 'string' 
            ? JSON.parse(serviceAccountKey) 
            : serviceAccountKey;
    } catch (error) {
        throw new Error(
            `Failed to parse GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY: ${(error as Error).message}`
        );
    }

    // Authenticate using Service Account
    const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
}

/**
 * Appends receipt data to the specified Google Sheet.
 * 
 * @param receiptData - The structured receipt data to append
 * @param sheetId - The Google Sheet ID (from the Sheet URL)
 * @returns Promise<void>
 * @throws Error if the append operation fails
 */
export async function appendReceiptToSheet(
    receiptData: ReceiptData,
    sheetId: string
): Promise<void> {
    if (!sheetId) {
        throw new Error("Google Sheet ID is required");
    }

    const sheets = getSheetsClient();

    // Map ReceiptData to the row format matching the Sheet headers
    // Headers: Vendor Name, Date, Total Amount, Category, Timestamp
    const rowData = [
        receiptData.vendorName,
        receiptData.transactionDate,
        receiptData.totalAmount,
        receiptData.category,
        receiptData.timestamp
    ];

    try {
        // Get the actual sheet name from the spreadsheet
        // This handles different languages (e.g., "Blad1" in Dutch, "Sheet1" in English)
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
        });
        
        const firstSheet = spreadsheet.data.sheets?.[0];
        const sheetName = firstSheet?.properties?.title || 'Sheet1';
        
        console.log(`Using sheet name: "${sheetName}"`);
        
        // Append the row to the Sheet
        // Using 'USER_ENTERED' valueInputOption to preserve number formatting
        const range = `${sheetName}!A:E`;
        console.log(`Appending to range: ${range}`);
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [rowData],
            },
        });

        console.log(`Successfully appended receipt to Sheet. Updated ${response.data.updates?.updatedCells || 0} cells.`);
        
        return;
    } catch (error) {
        console.error("Error appending to Google Sheet:", error);
        
        // Provide more detailed error information
        if (error instanceof Error) {
            throw new Error(`Failed to append to Google Sheet: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Verifies that the Sheet exists and has the correct headers.
 * This is useful for initial setup validation.
 * 
 * @param sheetId - The Google Sheet ID
 * @returns Promise<boolean> - True if headers are correct
 */
export async function validateSheetHeaders(sheetId: string): Promise<boolean> {
    const sheets = getSheetsClient();
    const expectedHeaders = ['Vendor Name', 'Date', 'Total Amount', 'Category', 'Timestamp'];

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Sheet1!A1:E1', // Get first row (headers)
        });

        const headers = response.data.values?.[0] || [];
        
        // Check if headers match (case-insensitive)
        const headersMatch = expectedHeaders.every((expected, index) => {
            const actual = headers[index]?.toString().trim() || '';
            return actual.toLowerCase() === expected.toLowerCase();
        });

        if (!headersMatch) {
            console.warn('Sheet headers do not match expected format:', {
                expected: expectedHeaders,
                actual: headers
            });
        }

        return headersMatch;
    } catch (error) {
        console.error("Error validating Sheet headers:", error);
        return false;
    }
}
