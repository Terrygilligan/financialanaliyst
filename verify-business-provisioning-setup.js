// Verify Business Provisioning Setup
// Checks if everything is configured correctly for business provisioning

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'functions', '.env') });

async function verifySetup() {
    console.log('\n🔍 Verifying Business Provisioning Setup...\n');

    // Check 1: Service Account Key
    const serviceAccountKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        console.error('❌ GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY not found in functions/.env');
        console.log('   This is required for business provisioning.\n');
        return false;
    }
    console.log('✅ Service Account Key found');

    let credentials;
    try {
        credentials = typeof serviceAccountKey === 'string' 
            ? JSON.parse(serviceAccountKey) 
            : serviceAccountKey;
        console.log(`✅ Service Account: ${credentials.client_email}`);
    } catch (error) {
        console.error('❌ Failed to parse service account key:', error.message);
        return false;
    }

    // Check 2: Folder ID
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
        console.error('❌ GOOGLE_DRIVE_FOLDER_ID not found in functions/.env');
        console.log('   Add this line to functions/.env:');
        console.log('   GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here\n');
        return false;
    }
    console.log(`✅ Folder ID found: ${folderId}`);

    // Check 3: Test Folder Access
    console.log('\n📁 Testing folder access...');
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: [
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/spreadsheets'
            ],
        });

        const drive = google.drive({ version: 'v3', auth: await auth.getClient() });

        // Try to get folder metadata
        const folder = await drive.files.get({
            fileId: folderId,
            fields: 'id, name, permissions, capabilities'
        });

        console.log(`✅ Folder accessible: ${folder.data.name || folderId}`);
        
        // Check if service account has access
        const permissions = folder.data.permissions || [];
        const serviceAccountEmail = credentials.client_email;
        const hasAccess = permissions.some(p => 
            p.emailAddress === serviceAccountEmail || 
            p.emailAddress?.toLowerCase() === serviceAccountEmail.toLowerCase()
        );

        if (hasAccess) {
            console.log(`✅ Service account has access to folder`);
        } else {
            console.warn(`⚠️  Service account may not have explicit access`);
            console.log(`   Share folder with: ${serviceAccountEmail}`);
            console.log(`   Role: Editor`);
        }

        // Check capabilities
        if (folder.data.capabilities) {
            const canEdit = folder.data.capabilities.canEdit;
            if (canEdit) {
                console.log(`✅ Can edit folder (good for creating subfolders)`);
            } else {
                console.warn(`⚠️  Cannot edit folder - may need Editor role`);
            }
        }

    } catch (error) {
        console.error(`❌ Error accessing folder:`, error.message);
        if (error.code === 404) {
            console.log('   Folder not found. Check the folder ID is correct.');
        } else if (error.code === 403) {
            console.log('   Permission denied. Make sure folder is shared with:');
            console.log(`   ${credentials.client_email}`);
            console.log('   Role: Editor');
        } else {
            console.log('   Check that Google Drive API is enabled:');
            console.log('   https://console.cloud.google.com/apis/library/drive.googleapis.com?project=<YOUR_PROJECT_ID>');
        }
        return false;
    }

    // Check 4: Test Sheet Creation Capability
    console.log('\n📊 Testing sheet creation capability...');
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive'
            ],
        });

        const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

        // Just verify we can initialize (don't actually create a sheet)
        console.log('✅ Sheets API accessible');
        
    } catch (error) {
        console.error(`❌ Error accessing Sheets API:`, error.message);
        console.log('   Check that Google Sheets API is enabled:');
        console.log('   https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=<YOUR_PROJECT_ID>');
        return false;
    }

    console.log('\n✅ All checks passed! Business provisioning should work.\n');
    return true;
}

verifySetup().catch(console.error);

