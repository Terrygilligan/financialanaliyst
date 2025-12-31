// test-sheet-creation.js
// Comprehensive test for Google Sheet creation with detailed error reporting
// This replicates exactly what sheet-operations.ts does

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'functions', '.env') });

async function testSheetCreation() {
    console.log('\n🧪 Testing Google Sheet Creation (Exact Replication of sheet-operations.ts)\n');
    console.log('=' .repeat(70));

    const serviceAccountKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
        console.error('❌ GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY not found');
        console.error('   Make sure functions/.env exists with the key\n');
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

    const serviceAccountEmail = credentials.client_email;
    const projectId = credentials.project_id;

    console.log(`📧 Service Account: ${serviceAccountEmail}`);
    console.log(`📦 Project ID: ${projectId}\n`);

    try {
        // Exact same auth setup as sheet-operations.ts
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.file'
            ],
        });

        const client = await auth.getClient();
        const resolvedProjectId = await auth.getProjectId();
        
        console.log(`🔐 Auth Client Project: ${resolvedProjectId}`);
        if (client && 'email' in client) {
            console.log(`🔐 Auth Client Email: ${client.email || 'N/A'}`);
        }
        console.log('');

        const sheets = google.sheets({ version: 'v4', auth });
        const drive = google.drive({ version: 'v3', auth });

        // Test 1: Check if Drive API is accessible
        console.log('📁 Test 1: Checking Google Drive API access...');
        try {
            const driveTest = await drive.files.list({
                pageSize: 1,
                fields: 'files(id, name)',
                q: "mimeType='application/vnd.google-apps.spreadsheet'"
            });
            console.log('   ✅ Drive API: Accessible');
            console.log(`   Found ${driveTest.data.files?.length || 0} existing sheets\n`);
        } catch (error) {
            console.error('   ❌ Drive API: FAILED');
            console.error(`   Error: ${error.message}`);
            console.error(`   Code: ${error.code}\n`);
            
            if (error.code === 403) {
                console.log('   🔧 SOLUTION: Enable Google Drive API');
                console.log('      https://console.cloud.google.com/apis/library/drive.googleapis.com?project=financialanaliyst\n');
            }
            throw error; // Don't continue if Drive API fails
        }

        // Test 2: Try to create a sheet (exact replication)
        console.log('📝 Test 2: Attempting to create a Google Sheet...');
        console.log('   (This is the exact call that fails in your app)\n');

        const sheetName = `Test Sheet ${new Date().toISOString().slice(0, 10)}`;
        
        try {
            const createResponse = await sheets.spreadsheets.create({
                requestBody: {
                    properties: {
                        title: sheetName,
                    },
                    sheets: [{
                        properties: {
                            title: 'Main',
                            gridProperties: {
                                rowCount: 1000,
                                columnCount: 10,
                                frozenRowCount: 1,
                            }
                        }
                    }]
                }
            });

            const sheetId = createResponse.data.spreadsheetId;
            const sheetUrl = createResponse.data.spreadsheetUrl;

            console.log('   ✅ SUCCESS! Sheet created successfully!');
            console.log(`   Sheet ID: ${sheetId}`);
            console.log(`   Sheet URL: ${sheetUrl}\n`);

            // Clean up
            console.log('🧹 Cleaning up test sheet...');
            try {
                await drive.files.delete({ fileId: sheetId });
                console.log('   ✅ Test sheet deleted\n');
            } catch (deleteError) {
                console.log(`   ⚠️  Could not delete test sheet: ${deleteError.message}`);
                console.log(`   Please delete manually: ${sheetUrl}\n`);
            }

            console.log('=' .repeat(70));
            console.log('✅ ALL TESTS PASSED! Sheet creation is working correctly.');
            console.log('   If your app still fails, check:');
            console.log('   1. Are you using the same service account key?');
            console.log('   2. Are the functions deployed with the latest code?');
            console.log('   3. Check Cloud Function logs for the actual error\n');
            return true;

        } catch (error) {
            console.error('   ❌ FAILED! This is the error you\'re seeing in your app');
            console.error(`   Error Message: ${error.message}`);
            console.error(`   Error Code: ${error.code || 'N/A'}`);
            
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Status Text: ${error.response.statusText}`);
                if (error.response.data) {
                    console.error(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
                }
            }

            console.log('\n   🔧 TROUBLESHOOTING STEPS:\n');
            
            if (error.code === 403 || error.message.includes('permission')) {
                console.log('   1. ✅ Enable Google Drive API:');
                console.log('      https://console.cloud.google.com/apis/library/drive.googleapis.com?project=financialanaliyst\n');
                console.log('   2. ✅ Verify service account has Editor/Owner role:');
                console.log('      https://console.cloud.google.com/iam-admin/iam?project=financialanaliyst');
                console.log(`      Look for: ${serviceAccountEmail}\n`);
                console.log('   3. ⏳ Wait 2-5 minutes for permissions to propagate\n');
                console.log('   4. 🔄 Redeploy functions after enabling API:');
                console.log('      cd functions && npm run build');
                console.log('      firebase deploy --only functions\n');
            } else if (error.message.includes('not enabled')) {
                console.log('   → Google Drive API is NOT enabled');
                console.log('   → Enable it: https://console.cloud.google.com/apis/library/drive.googleapis.com?project=financialanaliyst\n');
            } else {
                console.log('   → Check Cloud Function logs for more details');
                console.log('   → Verify service account JSON key is correct\n');
            }

            console.log('=' .repeat(70));
            return false;
        }

    } catch (error) {
        console.error('\n❌ Authentication or Setup Error:', error.message);
        console.error('   Check that your service account key is valid\n');
        process.exit(1);
    }
}

testSheetCreation()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });

