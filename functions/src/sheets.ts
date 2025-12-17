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
    // Headers: Vendor Name, Date, Total Amount, Category, Timestamp, Entity, Original Currency, Original Amount, Exchange Rate, Supplier VAT Number, VAT Subtotal, VAT Amount, VAT Rate, Processed By, Validation Status, Has Errors
    const rowData = [
        receiptData.vendorName,
        receiptData.transactionDate,
        receiptData.totalAmount,
        receiptData.category,
        receiptData.timestamp,
        receiptData.entity || 'Unassigned', // Phase 1.1: Entity Tracking
        receiptData.originalCurrency || '', // Phase 2.4: Currency Conversion
        receiptData.originalAmount || '', // Phase 2.4: Currency Conversion
        receiptData.exchangeRate || '', // Phase 2.4: Currency Conversion
        receiptData.supplierVatNumber || '', // Phase 3.1: VAT Extraction
        receiptData.vatBreakdown?.subtotal || '', // Phase 3.1: VAT Extraction
        receiptData.vatBreakdown?.vatAmount || '', // Phase 3.1: VAT Extraction
        receiptData.vatBreakdown?.vatRate || '', // Phase 3.1: VAT Extraction
        receiptData.processedBy || 'system', // Phase 3.3: Audit Trail
        receiptData.validationStatus || '', // Phase 3.3: Audit Trail
        receiptData.hasErrors ? 'YES' : 'NO' // Phase 3.3: Audit Trail
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
        // Range updated to A:P to include Entity, Currency, VAT, and Audit columns (Phase 1.1, 2.4, 3.1, 3.3)
        const range = `${sheetName}!A:P`;
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
 * Appends receipt data to the Accountant CSV-ready sheet tab.
 * This tab has a simplified format optimized for accountant workflows and CSV export.
 * 
 * Phase 3.2: Accountant CSV Tab
 * 
 * @param receiptData - The structured receipt data to append
 * @param sheetId - The Google Sheet ID
 * @returns Promise<void>
 * @throws Error if the append operation fails
 */
export async function appendToAccountantSheet(
    receiptData: ReceiptData,
    sheetId: string
): Promise<void> {
    if (!sheetId) {
        throw new Error("Google Sheet ID is required");
    }

    const sheets = getSheetsClient();
    const accountantSheetName = 'Accountant_CSV_Ready';

    // Accountant-optimized format: Date, Vendor, Entity, Amount, Currency, VAT Number, VAT Amount, Category, Notes
    const rowData = [
        receiptData.transactionDate, // Date (YYYY-MM-DD for easy sorting)
        receiptData.vendorName, // Vendor
        receiptData.entity || 'Unassigned', // Entity
        receiptData.totalAmount, // Amount (final total)
        receiptData.originalCurrency || receiptData.currency || 'GBP', // Currency
        receiptData.supplierVatNumber || '', // VAT Number
        receiptData.vatBreakdown?.vatAmount || '', // VAT Amount
        receiptData.category, // Category
        // Notes field: combine any relevant info
        [
            receiptData.originalAmount && receiptData.exchangeRate 
                ? `Converted from ${receiptData.originalAmount} ${receiptData.originalCurrency} @ ${receiptData.exchangeRate}` 
                : '',
            receiptData.vatBreakdown?.subtotal 
                ? `Subtotal: ${receiptData.vatBreakdown.subtotal}` 
                : '',
            receiptData.vatBreakdown?.vatRate 
                ? `VAT Rate: ${receiptData.vatBreakdown.vatRate}%` 
                : ''
        ].filter(Boolean).join(' | ') || ''
    ];

    try {
        // Check if Accountant_CSV_Ready sheet exists, create if not
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
        });
        
        const accountantSheet = spreadsheet.data.sheets?.find(
            sheet => sheet.properties?.title === accountantSheetName
        );

        if (!accountantSheet) {
            console.log(`Creating ${accountantSheetName} sheet...`);
            
            // Create the sheet
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: sheetId,
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: accountantSheetName,
                                gridProperties: {
                                    frozenRowCount: 1 // Freeze header row
                                }
                            }
                        }
                    }]
                }
            });

            // Add headers
            const headers = [
                'Date', 'Vendor', 'Entity', 'Amount', 'Currency', 
                'VAT Number', 'VAT Amount', 'Category', 'Notes'
            ];
            
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: `${accountantSheetName}!A1:I1`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [headers]
                }
            });

            // Format headers (bold, background color)
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: sheetId,
                requestBody: {
                    requests: [{
                        repeatCell: {
                            range: {
                                sheetId: (await sheets.spreadsheets.get({ spreadsheetId: sheetId }))
                                    .data.sheets?.find(s => s.properties?.title === accountantSheetName)
                                    ?.properties?.sheetId,
                                startRowIndex: 0,
                                endRowIndex: 1
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.85, green: 0.85, blue: 0.85 },
                                    textFormat: { bold: true }
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)'
                        }
                    }]
                }
            });

            console.log(`${accountantSheetName} sheet created successfully.`);
        }

        // Append the row
        const range = `${accountantSheetName}!A:I`;
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [rowData],
            },
        });

        console.log(`Successfully appended receipt to ${accountantSheetName}. Updated ${response.data.updates?.updatedCells || 0} cells.`);
        
        return;
    } catch (error) {
        console.error(`Error appending to ${accountantSheetName}:`, error);
        
        // Don't throw - this is a secondary write, main sheet is more important
        // Log the error but allow the function to continue
        if (error instanceof Error) {
            console.warn(`Failed to append to ${accountantSheetName}: ${error.message}`);
        }
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
    const expectedHeaders = ['Vendor Name', 'Date', 'Total Amount', 'Category', 'Timestamp', 'Entity', 'Original Currency', 'Original Amount', 'Exchange Rate', 'Supplier VAT Number', 'VAT Subtotal', 'VAT Amount', 'VAT Rate', 'Processed By', 'Validation Status', 'Has Errors'];

    try {
        // Get the actual sheet name from the spreadsheet (same logic as appendReceiptToSheet)
        // This handles different languages (e.g., "Blad1" in Dutch, "Sheet1" in English)
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
        });
        
        const firstSheet = spreadsheet.data.sheets?.[0];
        const sheetName = firstSheet?.properties?.title || 'Sheet1';
        
        console.log(`Validating headers in sheet: "${sheetName}"`);
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A1:P1`, // Use dynamic sheet name instead of hard-coded 'Sheet1', updated for currency, VAT, and audit fields
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
