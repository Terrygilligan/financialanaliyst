// functions/src/business-provisioning.ts
// Automated Business Provisioning System
// Creates Google Drive folders and sheets automatically when a business signs up

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { google } from "googleapis";

const db = getFirestore();

/**
 * Business interface matching Firestore structure
 */
export interface Business {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  googleDrive: {
    folderId: string;
    folderUrl: string;
    sheetId: string;
    sheetUrl: string;
  };
  bookkeeperEmail: string;
  bookkeeperUid: string;
  authorizedUsers: string[];
  settings: {
    mainTabName?: string;
    accountantTabName?: string;
    currency?: string;
    timezone?: string;
  };
  status: 'active' | 'suspended' | 'provisioning' | 'error';
  provisioningError?: string;
  stats?: {
    totalReceipts: number;
    totalAmount: number;
    lastReceiptAt?: string;
  };
}

/**
 * Get Google Auth client using Application Default Credentials (ADC)
 * This automatically uses the service account identity when deployed to Cloud Functions
 * Falls back to environment variable for local development/emulator
 */
function getGoogleAuthClient() {
  // Check if running in emulator or local development
  const isLocal = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIRESTORE_EMULATOR_HOST !== undefined;
  
  logger.info('[Business Provisioning] Environment detection', {
    isLocal,
    hasServiceAccountKey: !!process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY
  });

  // For local/emulator: Use service account key from environment variable
  if (isLocal && process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY) {
    logger.info('[Business Provisioning] Using service account key from environment (local/emulator mode)');
    
    let credentials;
    try {
      const serviceAccountKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
      credentials = typeof serviceAccountKey === 'string' 
        ? JSON.parse(serviceAccountKey) 
        : serviceAccountKey;
    } catch (error) {
      logger.error('[Business Provisioning] Failed to parse service account key', { error });
      throw new Error(`Failed to parse GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY: ${(error as Error).message}`);
    }

    return new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
    });
  }

  // For production: Use Application Default Credentials (ADC)
  // The Cloud Function's service account identity is automatically used
  logger.info('[Business Provisioning] Using Application Default Credentials (ADC) - production mode');
  
  return new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ],
  });
}

/**
 * Provision a new business using Firestore Transaction for atomicity
 * Only commits the business document after successfully creating Drive folder, Sheet, and granting permissions
 * 
 * @param businessName - Name of the business
 * @param bookkeeperUid - Firebase Auth UID of the bookkeeper
 * @param bookkeeperEmail - Email of the bookkeeper
 * @param googleAccessToken - Optional OAuth token (for personal accounts)
 * @param domainWideDelegationEmail - Optional email for DWD (for Workspace accounts)
 * @returns Business document with folder and sheet IDs
 */
export async function provisionBusiness(
  businessName: string,
  bookkeeperUid: string,
  bookkeeperEmail: string,
  googleAccessToken?: string,
  domainWideDelegationEmail?: string
): Promise<Business> {
  const businessId = `business-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('[Business Provisioning] Starting provisioning', {
    businessId,
    businessName,
    bookkeeperEmail,
    bookkeeperUid,
    hasOAuthToken: !!googleAccessToken,
    hasDWD: !!domainWideDelegationEmail
  });

  // Prepare business data (without Google Drive info yet)
  const businessData: Partial<Business> = {
    id: businessId,
    name: businessName,
    createdAt: new Date().toISOString(),
    createdBy: bookkeeperUid,
    bookkeeperEmail,
    bookkeeperUid,
    authorizedUsers: [bookkeeperEmail],
    settings: {
      mainTabName: 'Sheet1',
      accountantTabName: 'Accountant_CSV_Ready',
      currency: 'GBP',
      timezone: 'Europe/London'
    },
    status: 'provisioning',
    stats: {
      totalReceipts: 0,
      totalAmount: 0
    }
  };

  try {
    // Step 1: Create Google Drive Folder
    logger.info('[Business Provisioning] Step 1: Creating Drive folder');
    const folderResult = await createBusinessFolder(
      businessName,
      bookkeeperEmail,
      googleAccessToken,
      domainWideDelegationEmail
    );
    
    logger.info('[Business Provisioning] Folder created successfully', {
      folderId: folderResult.folderId,
      folderUrl: folderResult.folderUrl
    });
    
    // Step 2: Create Google Sheet inside folder
    logger.info('[Business Provisioning] Step 2: Creating Google Sheet');
    const sheetResult = await createBusinessSheet(
      businessName,
      folderResult.folderId,
      googleAccessToken,
      domainWideDelegationEmail
    );
    
    logger.info('[Business Provisioning] Sheet created successfully', {
      sheetId: sheetResult.sheetId,
      sheetUrl: sheetResult.sheetUrl
    });
    
    // Step 3: Grant permissions (Writer role for bookkeeper)
    logger.info('[Business Provisioning] Step 3: Granting Drive permissions');
    await grantBusinessPermissions(
      folderResult.folderId,
      sheetResult.sheetId,
      bookkeeperEmail,
      googleAccessToken,
      domainWideDelegationEmail
    );
    
    logger.info('[Business Provisioning] Permissions granted successfully', {
      bookkeeperEmail
    });
    
    // Step 4: Use Firestore Transaction to atomically save business document
    // This ensures the document is only created if all Google Drive operations succeeded
    logger.info('[Business Provisioning] Step 4: Saving business document in transaction');
    
    const updatedBusiness: Business = await db.runTransaction(async (transaction) => {
      const businessRef = db.collection('businesses').doc(businessId);
      
      // Check if business already exists (shouldn't happen, but safety check)
      const businessDoc = await transaction.get(businessRef);
      if (businessDoc.exists) {
        logger.warn('[Business Provisioning] Business document already exists', { businessId });
        throw new Error('Business document already exists');
      }
      
      // Prepare complete business data with Google Drive info
      const completeBusinessData: Business = {
        ...businessData as Business,
        googleDrive: {
          folderId: folderResult.folderId,
          folderUrl: folderResult.folderUrl,
          sheetId: sheetResult.sheetId,
          sheetUrl: sheetResult.sheetUrl
        },
        status: 'active'
      };
      
      // Atomically create the business document
      transaction.set(businessRef, completeBusinessData);
      
      logger.info('[Business Provisioning] Transaction prepared, committing...');
      
      return completeBusinessData;
    });
    
    logger.info('[Business Provisioning] Business provisioning complete', {
      businessId: updatedBusiness.id,
      status: updatedBusiness.status
    });
    
    return updatedBusiness;
    
  } catch (error: any) {
    logger.error('[Business Provisioning] Error provisioning business', {
      businessId,
      error: error.message,
      stack: error.stack,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    // Log detailed error information for debugging
    if (error.response) {
      logger.error('[Business Provisioning] API Error Details', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    // Don't create a business document if provisioning failed
    // The transaction ensures no partial data is saved
    throw error;
  }
}

/**
 * Create a Google Drive folder for the business
 */
async function createBusinessFolder(
  businessName: string,
  bookkeeperEmail: string,
  googleAccessToken?: string,
  domainWideDelegationEmail?: string
): Promise<{ folderId: string; folderUrl: string }> {
  let authClient: any;
  
  // Determine authentication method
  if (domainWideDelegationEmail) {
    logger.info('[Business Provisioning] Using Domain-Wide Delegation', { email: domainWideDelegationEmail });
    const serviceAccount = getGoogleAuthClient();
    const jwtClient = await serviceAccount.getClient() as any;
    
    authClient = new google.auth.JWT(
      jwtClient.email,
      undefined,
      jwtClient.key,
      ['https://www.googleapis.com/auth/drive.file'],
      domainWideDelegationEmail
    );
  } else if (googleAccessToken) {
    logger.info('[Business Provisioning] Using OAuth token for folder creation');
    authClient = new google.auth.OAuth2();
    authClient.setCredentials({ 
      access_token: googleAccessToken 
    });
  } else {
    logger.info('[Business Provisioning] Using service account (ADC) for folder creation');
    authClient = getGoogleAuthClient();
  }
  
  const drive = google.drive({ version: 'v3', auth: authClient });
  const folderName = `${businessName} - Financial Records`;
  
  try {
    const folderResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        ...(process.env.GOOGLE_DRIVE_FOLDER_ID && !googleAccessToken && !domainWideDelegationEmail
          ? { parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] }
          : {})
      },
      fields: 'id, webViewLink'
    });
  
    const folderId = folderResponse.data.id!;
    const folderUrl = folderResponse.data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`;
    
    return { folderId, folderUrl };
  } catch (error: any) {
    logger.error('[Business Provisioning] Error creating folder', {
      error: error.message,
      code: error.code,
      status: error.response?.status,
      responseData: error.response?.data
    });
    throw new Error(`Failed to create Google Drive folder: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Create a Google Sheet inside the business folder
 */
async function createBusinessSheet(
  businessName: string,
  folderId: string,
  googleAccessToken?: string,
  domainWideDelegationEmail?: string
): Promise<{ sheetId: string; sheetUrl: string }> {
  let authClient: any;
  
  // Determine authentication method (same logic as folder creation)
  if (domainWideDelegationEmail) {
    const serviceAccount = getGoogleAuthClient();
    const jwtClient = await serviceAccount.getClient() as any;
    authClient = new google.auth.JWT(
      jwtClient.email,
      undefined,
      jwtClient.key,
      ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
      domainWideDelegationEmail
    );
  } else if (googleAccessToken) {
    logger.info('[Business Provisioning] Using OAuth token for sheet creation');
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    
    if (clientId && clientSecret) {
      authClient = new google.auth.OAuth2(clientId, clientSecret);
    } else {
      authClient = new google.auth.OAuth2();
    }
    
    authClient.setCredentials({ 
      access_token: googleAccessToken 
    });
  } else {
    logger.info('[Business Provisioning] Using service account (ADC) for sheet creation');
    authClient = getGoogleAuthClient();
  }
  
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const drive = google.drive({ version: 'v3', auth: authClient });
  
  const sheetName = `${businessName} - Receipts`;
  
  try {
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: sheetName
        },
        sheets: [
          {
            properties: {
              title: 'Sheet1'
            }
          },
          {
            properties: {
              title: 'Accountant_CSV_Ready'
            }
          }
        ]
      }
    });
  
    const sheetId = createResponse.data.spreadsheetId!;
    const sheetUrl = createResponse.data.spreadsheetUrl!;
    
    // Move sheet to folder (if not already in folder via OAuth/DWD)
    if (!googleAccessToken && !domainWideDelegationEmail) {
      try {
        const file = await drive.files.get({
          fileId: sheetId,
          fields: 'parents'
        });
        
        const previousParents = file.data.parents?.join(',') || '';
        
        await drive.files.update({
          fileId: sheetId,
          addParents: folderId,
          removeParents: previousParents,
          fields: 'id, parents'
        });
        
        logger.info('[Business Provisioning] Sheet moved to folder successfully');
      } catch (moveError: any) {
        logger.warn('[Business Provisioning] Could not move sheet to folder', {
          error: moveError.message,
          sheetId,
          folderId
        });
      }
    }
    
    // Format sheet with headers
    await formatBusinessSheet(sheets, sheetId);
    
    return { sheetId, sheetUrl };
  } catch (error: any) {
    logger.error('[Business Provisioning] Error creating sheet', {
      error: error.message,
      code: error.code,
      status: error.response?.status,
      responseData: error.response?.data
    });
    throw new Error(`Failed to create Google Sheet: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Format the business sheet with headers
 */
async function formatBusinessSheet(sheets: any, sheetId: string): Promise<void> {
  const headers = [
    'Vendor Name', 
    'Transaction Date', 
    'Total Amount', 
    'Category', 
    'Currency', 
    'Notes'
  ];
  
  try {
    // Format main tab (Sheet1)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            updateCells: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length
              },
              rows: [{
                values: headers.map(header => ({
                  userEnteredValue: { stringValue: header },
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.4, blue: 0.8, alpha: 1 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                  }
                }))
              }],
              fields: 'userEnteredValue,userEnteredFormat'
            }
          }
        ]
      }
    });
    
    // Format accountant tab (Accountant_CSV_Ready)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            updateCells: {
              range: {
                sheetId: 1,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length
              },
              rows: [{
                values: headers.map(header => ({
                  userEnteredValue: { stringValue: header },
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.4, blue: 0.8, alpha: 1 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                  }
                }))
              }],
              fields: 'userEnteredValue,userEnteredFormat'
            }
          }
        ]
      }
    });
    
    logger.info('[Business Provisioning] Sheet formatted successfully');
  } catch (error: any) {
    logger.warn('[Business Provisioning] Error formatting sheet', {
      error: error.message,
      sheetId
    });
    // Don't throw - formatting is non-critical
  }
}

/**
 * Grant permissions to bookkeeper (Writer role) and ensure service account has access
 */
async function grantBusinessPermissions(
  folderId: string,
  sheetId: string,
  bookkeeperEmail: string,
  googleAccessToken?: string,
  domainWideDelegationEmail?: string
): Promise<void> {
  // If using DWD or OAuth, permissions are already set (user owns the files)
  if (domainWideDelegationEmail || googleAccessToken) {
    logger.info('[Business Provisioning] Permissions already set via DWD/OAuth');
    return;
  }
  
  // For service account: Share folder and sheet with bookkeeper (Writer role)
  logger.info('[Business Provisioning] Granting Writer permissions to bookkeeper', {
    bookkeeperEmail,
    folderId,
    sheetId
  });
  
  const authClient = getGoogleAuthClient();
  const drive = google.drive({ version: 'v3', auth: authClient });
  
  try {
    // Share folder with bookkeeper (Writer role)
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: bookkeeperEmail
      },
      sendNotificationEmail: false
    });
    
    logger.info('[Business Provisioning] Folder permissions granted', { bookkeeperEmail, folderId });
    
    // Share sheet with bookkeeper (Writer role)
    await drive.permissions.create({
      fileId: sheetId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: bookkeeperEmail
      },
      sendNotificationEmail: false
    });
    
    logger.info('[Business Provisioning] Sheet permissions granted', { bookkeeperEmail, sheetId });
    
  } catch (error: any) {
    logger.error('[Business Provisioning] Error granting permissions', {
      error: error.message,
      code: error.code,
      status: error.response?.status,
      responseData: error.response?.data,
      bookkeeperEmail,
      folderId,
      sheetId
    });
    throw new Error(`Failed to grant permissions: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get business by ID
 */
export async function getBusiness(businessId: string): Promise<Business | null> {
  const doc = await db.collection('businesses').doc(businessId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as Business;
}

/**
 * Get business by bookkeeper UID
 */
export async function getBusinessByBookkeeper(bookkeeperUid: string): Promise<Business | null> {
  const snapshot = await db.collection('businesses')
    .where('bookkeeperUid', '==', bookkeeperUid)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Business;
}
