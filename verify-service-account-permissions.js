// verify-service-account-permissions.js
// Script to verify service account has proper permissions to create Google Sheets

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'functions', '.env') });

async function verifyPermissions() {
    console.log('\n🔍 Verifying Service Account Permissions...\n');

    // 1. Check environment variable
    const serviceAccountKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
        console.error('❌ GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY not found in environment');
        console.log('   Make sure you have a .env file in functions/ directory');
        process.exit(1);
    }
    
    console.log('✅ Environment variable found');

    // 2. Parse credentials
    let credentials;
    try {
        credentials = typeof serviceAccountKey === 'string' 
            ? JSON.parse(serviceAccountKey) 
            : serviceAccountKey;
        console.log('✅ Service account key is valid JSON');
        console.log(`   Service Account Email: ${credentials.client_email}`);
        console.log(`   Project ID: ${credentials.project_id}`);
    } catch (error) {
        console.error('❌ Failed to parse service account key:', error.message);
        process.exit(1);
    }

    // 3. Test Google Sheets API access
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.file'
            ],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const drive = google.drive({ version: 'v3', auth });

        console.log('\n📊 Testing Google Sheets API...');
        
        // Try to list spreadsheets (this tests basic access)
        try {
            const driveResponse = await drive.files.list({
                q: "mimeType='application/vnd.google-apps.spreadsheet'",
                pageSize: 1,
                fields: 'files(id, name)'
            });
            console.log('✅ Google Sheets API: Accessible');
            console.log(`   Found ${driveResponse.data.files?.length || 0} sheets`);
        } catch (error) {
            if (error.code === 403) {
                console.error('❌ Google Sheets API: Permission denied');
                console.error('   → Enable Google Sheets API in Cloud Console');
                console.error('   → Grant Editor/Owner role to service account');
            } else {
                console.error('❌ Google Sheets API: Error', error.message);
            }
        }

        console.log('\n📁 Testing Google Drive API...');
        
        // Try to create a test file (this tests creation permissions)
        try {
            const testSheet = await sheets.spreadsheets.create({
                requestBody: {
                    properties: {
                        title: 'Permission Test Sheet (Delete Me)',
                    },
                    sheets: [{
                        properties: {
                            title: 'Test',
                        }
                    }]
                }
            });

            const testSheetId = testSheet.data.spreadsheetId;
            console.log('✅ Google Drive API: Can create sheets');
            console.log(`   Created test sheet: ${testSheetId}`);
            
            // Clean up: Delete the test sheet
            try {
                await drive.files.delete({ fileId: testSheetId });
                console.log('   ✅ Test sheet deleted (cleanup)');
            } catch (deleteError) {
                console.log(`   ⚠️  Could not delete test sheet (non-critical): ${deleteError.message}`);
                console.log(`   Please manually delete: https://docs.google.com/spreadsheets/d/${testSheetId}/edit`);
            }
        } catch (error) {
            if (error.code === 403) {
                console.error('❌ Google Drive API: Permission denied');
                console.error('   → Enable Google Drive API in Cloud Console');
                console.error('   → Grant Editor/Owner role to service account');
            } else if (error.message.includes('not enabled')) {
                console.error('❌ Google Drive API: Not enabled');
                console.error('   → Enable Google Drive API in Cloud Console');
            } else {
                console.error('❌ Google Drive API: Error', error.message);
            }
        }

        console.log('\n📋 Summary:');
        console.log('   If you see errors above, follow these steps:');
        console.log('   1. Go to: https://console.cloud.google.com/apis/library?project=financialanaliyst');
        console.log('   2. Enable: Google Sheets API');
        console.log('   3. Enable: Google Drive API');
        console.log('   4. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=financialanaliyst');
        console.log('   5. Find: financial-output@financialanaliyst.iam.gserviceaccount.com');
        console.log('   6. Grant: Editor or Owner role');
        console.log('   7. Restart Firebase emulators');
        console.log('\n');

    } catch (error) {
        console.error('❌ Error testing APIs:', error.message);
        process.exit(1);
    }
}

// Run verification
verifyPermissions()
    .then(() => {
        console.log('✅ Verification complete!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    });

