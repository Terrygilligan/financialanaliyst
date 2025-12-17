// functions/src/sheets.ts
// Phase 4: Multi-Sheet Management - Updated for per-user sheet routing

import { google } from "googleapis";
import { ReceiptData } from "./schema";
import { getSheetConfigForUser, incrementSheetStats } from "./sheet-config";

/**
 * Initialize Google Sheets API client using Service Account credentials.
 * The Service Account JSON key should be provided via environment variable.
 * 
 * Phase 4: Now exported for use in sheet health checks
 */
export function getSheetsClient() {
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
 * Phase 4: Updated to accept optional tab name for multi-sheet support
 * 
 * @param receiptData - The structured receipt data to append
 * @param sheetId - The Google Sheet ID (from the Sheet URL)
 * @param tabName - Optional tab name (defaults to auto-detected first sheet)
 * @returns Promise<void>
 * @throws Error if the append operation fails
 */
export async function appendReceiptToSheet(
    receiptData: ReceiptData,
    sheetId: string,
    tabName?: string
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
        // Phase 4: Use provided tab name or auto-detect
        let sheetName = tabName;
        
        if (!sheetName) {
            // Get the actual sheet name from the spreadsheet
            // This handles different languages (e.g., "Blad1" in Dutch, "Sheet1" in English)
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: sheetId,
            });
            
            const firstSheet = spreadsheet.data.sheets?.[0];
            sheetName = firstSheet?.properties?.title || 'Sheet1';
        }
        
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
 * Phase 4: Updated to accept optional tab name for multi-sheet support
 * 
 * @param receiptData - The structured receipt data to append
 * @param sheetId - The Google Sheet ID
 * @param tabName - Optional accountant tab name (defaults to 'Accountant_CSV_Ready')
 * @returns Promise<void>
 * @throws Error if the append operation fails
 */
export async function appendToAccountantSheet(
    receiptData: ReceiptData,
    sheetId: string,
    tabName?: string
): Promise<void> {
    if (!sheetId) {
        throw new Error("Google Sheet ID is required");
    }

    const sheets = getSheetsClient();
    // Phase 4: Use provided tab name or default
    const accountantSheetName = tabName || 'Accountant_CSV_Ready';

    // Accountant-optimized format: Date, Vendor, Entity, Amount, Currency, VAT Number, VAT Amount, Category, Notes
    const rowData = [
        receiptData.transactionDate, // Date (YYYY-MM-DD for easy sorting)
        receiptData.vendorName, // Vendor
        receiptData.entity || 'Unassigned', // Entity
        receiptData.totalAmount, // Amount (final total - after conversion if applicable)
        process.env.BASE_CURRENCY || 'GBP', // Currency (always base currency after conversion)
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
            
            // Create the sheet and get its ID
            const createResponse = await sheets.spreadsheets.batchUpdate({
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

            // Get the newly created sheet ID from the response
            const newSheetId = createResponse.data.replies?.[0]?.addSheet?.properties?.sheetId;
            if (newSheetId === undefined) {
                console.error('Failed to get sheet ID after creation');
                throw new Error('Failed to create accountant sheet');
            }

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

            // Format headers (bold, background color) using the sheet ID we just got
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: sheetId,
                requestBody: {
                    requests: [{
                        repeatCell: {
                            range: {
                                sheetId: newSheetId, // Use the sheet ID from creation response
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

            console.log(`${accountantSheetName} sheet created successfully with ID: ${newSheetId}`);
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

/**
 * Phase 4: Append receipt to the correct sheet for a user
 * 
 * This function handles the complete multi-sheet workflow:
 * 1. Looks up the correct sheet config for the user
 * 2. Determines the sheet ID and tab names
 * 3. Writes to both main and accountant tabs
 * 4. Updates sheet statistics
 * 
 * @param receiptData - The structured receipt data
 * @param userId - The user's Firebase Auth UID
 * @returns Object with success status, sheet ID, and sheet link
 */
export async function appendReceiptToUserSheet(
  receiptData: ReceiptData,
  userId: string
): Promise<{ success: boolean; sheetId: string; sheetLink: string; configId?: string }> {
  try {
    console.log(`[Multi-Sheet] Processing receipt for user: ${userId}`);
    
    // 1. Get the correct sheet config for this user
    const sheetConfig = await getSheetConfigForUser(userId);
    
    // 2. Determine sheet ID (fall back to env variable if no config)
    const sheetId = sheetConfig?.sheetId || process.env.GOOGLE_SHEET_ID;
    
    if (!sheetId) {
      throw new Error('No sheet ID found for user and no GOOGLE_SHEET_ID environment variable set');
    }
    
    console.log(`[Multi-Sheet] Using sheet: ${sheetId}${sheetConfig ? ` (config: ${sheetConfig.id})` : ' (env default)'}`);
    
    // 3. Get tab names from config (or use defaults)
    const mainTabName = sheetConfig?.config?.mainTabName;
    const accountantTabName = sheetConfig?.config?.accountantTabName;
    
    console.log(`[Multi-Sheet] Main tab: ${mainTabName || 'auto'}, Accountant tab: ${accountantTabName || 'default'}`);
    
    // 4. Write to main sheet
    await appendReceiptToSheet(receiptData, sheetId, mainTabName);
    console.log(`[Multi-Sheet] ✅ Receipt written to main sheet`);
    
    // 5. Write to accountant sheet (non-blocking)
    try {
      await appendToAccountantSheet(receiptData, sheetId, accountantTabName);
      console.log(`[Multi-Sheet] ✅ Receipt written to accountant sheet`);
    } catch (error) {
      console.warn('[Multi-Sheet] ⚠️ Failed to write to accountant sheet (non-critical):', error);
      // Don't fail the whole operation if accountant tab fails
    }
    
    // 6. Update sheet statistics
    if (sheetConfig) {
      await incrementSheetStats(sheetConfig.id);
      console.log(`[Multi-Sheet] ✅ Sheet stats updated`);
    }
    
    return {
      success: true,
      sheetId: sheetId,
      sheetLink: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      configId: sheetConfig?.id
    };
  } catch (error) {
    console.error('[Multi-Sheet] ❌ Error appending receipt to user sheet:', error);
    throw error;
  }
}

