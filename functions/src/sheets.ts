// functions/src/sheets.ts

import { google } from "googleapis";
import { defineSecret } from "firebase-functions/params";
import { ReceiptData } from "./schema";

/**
 * Define the secret parameter for the Service Account Key.
 * This ensures the key is securely stored in Google Cloud Secret Manager
 * and only accessible to the function at runtime.
 */
export const googleSheetsKey = defineSecret("GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY");

/**
 * Initialize Google Sheets API client using Service Account credentials.
 * The Service Account JSON key is retrieved from the Secret Manager param.
 */
function getSheetsClient() {
    const serviceAccountKey = googleSheetsKey.value();
    
    if (!serviceAccountKey) {
        throw new Error(
            "GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY secret is not available. " +
            "Ensure the secret is set in Firebase/Google Cloud and the function has access."
        );
    }

    let credentials;
    try {
        // Parse the JSON key (could be a JSON string or already parsed object)
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
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
        });
        
        const firstSheet = spreadsheet.data.sheets?.[0];
        const sheetName = firstSheet?.properties?.title || 'Sheet1';
        
        console.log(`Using sheet name: "${sheetName}"`);
        
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
        if (error instanceof Error) {
            throw new Error(`Failed to append to Google Sheet: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Verifies that the Sheet exists and has the correct headers.
 */
export async function validateSheetHeaders(sheetId: string): Promise<boolean> {
    const sheets = getSheetsClient();
    const expectedHeaders = ['Vendor Name', 'Date', 'Total Amount', 'Category', 'Timestamp'];

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Sheet1!A1:E1',
        });

        const headers = response.data.values?.[0] || [];
        
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
