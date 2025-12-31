// check-drive-api-status.js
// Check if Google Drive API is enabled

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'functions', '.env') });

async function checkDriveAPI() {
    console.log('\n🔍 Checking Google Drive API Status...\n');

    const serviceAccountKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
        console.error('❌ GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY not found');
        process.exit(1);
    }

    let credentials;
    try {
        credentials = typeof serviceAccountKey === 'string' 
            ? JSON.parse(serviceAccountKey) 
            : serviceAccountKey;
    } catch (error) {
        console.error('❌ Failed to parse service account key:', error.message);
        process.exit(1);
    }

    try {
        // Use Application Default Credentials approach
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: [
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.file'
            ],
        });

        const drive = google.drive({ version: 'v3', auth });

        console.log('📁 Testing Google Drive API access...\n');

        // Try to list files (minimal permission test)
        try {
            const response = await drive.files.list({
                pageSize: 1,
                fields: 'files(id, name)',
                q: "mimeType='application/vnd.google-apps.spreadsheet'"
            });
            
            console.log('✅ Google Drive API: ENABLED and ACCESSIBLE');
            console.log(`   Found ${response.data.files?.length || 0} spreadsheets\n`);
            
        } catch (error) {
            console.error('❌ Google Drive API Error:', error.message);
            console.error(`   Error Code: ${error.code}\n`);
            
            if (error.code === 403) {
                console.log('🔧 Troubleshooting Steps:');
                console.log('   1. Verify Google Drive API is enabled:');
                console.log('      https://console.cloud.google.com/apis/library/drive.googleapis.com?project=financialanaliyst\n');
                console.log('   2. Verify service account has Editor role in IAM:');
                console.log('      https://console.cloud.google.com/iam-admin/iam?project=financialanaliyst\n');
                console.log('   3. Wait 2-3 minutes for permissions to propagate\n');
                console.log('   4. Check if service account email is correct:');
                console.log(`      ${credentials.client_email}\n`);
            } else if (error.message.includes('not enabled')) {
                console.log('🔧 Solution: Enable Google Drive API');
                console.log('   https://console.cloud.google.com/apis/library/drive.googleapis.com?project=financialanaliyst\n');
            }
        }

        // Try to create a test file (this is what we actually need)
        console.log('📝 Testing sheet creation capability...\n');
        try {
            const sheets = google.sheets({ version: 'v4', auth });
            const testSheet = await sheets.spreadsheets.create({
                requestBody: {
                    properties: {
                        title: 'Drive API Test Sheet (Delete Me)',
                    },
                    sheets: [{
                        properties: {
                            title: 'Test',
                        }
                    }]
                }
            });

            const testSheetId = testSheet.data.spreadsheetId;
            console.log('✅ Sheet Creation: WORKING!');
            console.log(`   Created test sheet: ${testSheetId}`);
            
            // Clean up
            try {
                await drive.files.delete({ fileId: testSheetId });
                console.log('   ✅ Test sheet deleted (cleanup)\n');
            } catch (deleteError) {
                console.log(`   ⚠️  Could not delete test sheet: ${deleteError.message}`);
                console.log(`   Please delete manually: https://docs.google.com/spreadsheets/d/${testSheetId}/edit\n`);
            }
            
        } catch (error) {
            console.error('❌ Sheet Creation Error:', error.message);
            console.error(`   Error Code: ${error.code}\n`);
            
            if (error.code === 403) {
                console.log('🔧 This is the actual error you\'re seeing in the UI!');
                console.log('   The service account needs Editor role in IAM.\n');
            }
        }

    } catch (error) {
        console.error('❌ Authentication Error:', error.message);
        process.exit(1);
    }
}

checkDriveAPI()
    .then(() => {
        console.log('✅ Check complete!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Check failed:', error);
        process.exit(1);
    });

