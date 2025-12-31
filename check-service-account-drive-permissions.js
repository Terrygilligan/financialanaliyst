// check-service-account-drive-permissions.js
// Check service account Drive permissions and quota

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'functions', '.env') });

async function checkPermissions() {
    console.log('\n🔍 Checking Service Account Drive Permissions & Quota...\n');

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

    const serviceAccountEmail = credentials.client_email;
    console.log(`📧 Service Account: ${serviceAccountEmail}\n`);

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: [
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.file'
            ],
        });

        const drive = google.drive({ version: 'v3', auth });

        // Check 1: Can we list files? (This works)
        console.log('📁 Test 1: Listing files (read access)...');
        try {
            const listResponse = await drive.files.list({
                pageSize: 5,
                fields: 'files(id, name, mimeType, size)',
                q: "mimeType='application/vnd.google-apps.spreadsheet'"
            });
            console.log(`   ✅ Can list files (${listResponse.data.files?.length || 0} found)\n`);
        } catch (error) {
            console.error(`   ❌ Cannot list files: ${error.message}\n`);
        }

        // Check 2: Can we get about info? (Shows quota)
        console.log('💾 Test 2: Checking Drive quota and storage...');
        try {
            const aboutResponse = await drive.about.get({
                fields: 'storageQuota,user'
            });
            
            const quota = aboutResponse.data.storageQuota;
            const user = aboutResponse.data.user;
            
            console.log(`   ✅ Drive Info Retrieved:`);
            console.log(`   User: ${user?.displayName || 'N/A'} (${user?.emailAddress || 'N/A'})`);
            
            if (quota) {
                if (quota.limit) {
                    const limitGB = (parseInt(quota.limit) / (1024 * 1024 * 1024)).toFixed(2);
                    const usedGB = quota.usage ? (parseInt(quota.usage) / (1024 * 1024 * 1024)).toFixed(2) : '0';
                    console.log(`   Storage Limit: ${limitGB} GB`);
                    console.log(`   Storage Used: ${usedGB} GB`);
                    
                    if (quota.usageInDrive) {
                        const usedInDriveGB = (parseInt(quota.usageInDrive) / (1024 * 1024 * 1024)).toFixed(2);
                        console.log(`   Used in Drive: ${usedInDriveGB} GB`);
                    }
                } else {
                    console.log(`   ⚠️  No storage limit set (unlimited?)`);
                }
            } else {
                console.log(`   ⚠️  Quota info not available`);
            }
            console.log('');
        } catch (error) {
            console.error(`   ❌ Cannot get quota info: ${error.message}`);
            console.error(`   This might indicate permission issues\n`);
        }

        // Check 3: Try creating a minimal file (not a sheet)
        console.log('📝 Test 3: Testing file creation capability...');
        try {
            // Try creating a simple text file
            const fileMetadata = {
                name: 'test-file-' + Date.now() + '.txt',
                mimeType: 'text/plain'
            };
            
            const media = {
                mimeType: 'text/plain',
                body: 'Test file content'
            };
            
            const createResponse = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, name'
            });
            
            console.log(`   ✅ Can create files!`);
            console.log(`   Created: ${createResponse.data.name} (${createResponse.data.id})`);
            
            // Clean up
            try {
                await drive.files.delete({ fileId: createResponse.data.id });
                console.log(`   ✅ Test file deleted\n`);
            } catch (e) {
                console.log(`   ⚠️  Could not delete test file\n`);
            }
        } catch (error) {
            console.error(`   ❌ Cannot create files: ${error.message}`);
            console.error(`   Error Code: ${error.code || 'N/A'}\n`);
            
            if (error.code === 403) {
                console.log('   🔧 This is the same 403 error you\'re seeing!');
                console.log('   The service account can READ but cannot CREATE files.\n');
                console.log('   SOLUTION OPTIONS:');
                console.log('   1. Grant "Editor" or "Owner" role to service account in IAM');
                console.log('      https://console.cloud.google.com/iam-admin/iam?project=<YOUR_PROJECT_ID>');
                console.log('   2. Check if service account has Drive API quota restrictions');
                console.log('   3. Verify the service account is not in a restricted organization\n');
            }
        }

        // Check 4: Try creating via Drive API directly (not Sheets API)
        console.log('📊 Test 4: Testing spreadsheet creation via Drive API...');
        try {
            const driveCreateResponse = await drive.files.create({
                requestBody: {
                    name: 'Drive API Test Sheet ' + Date.now(),
                    mimeType: 'application/vnd.google-apps.spreadsheet'
                },
                fields: 'id, name, webViewLink'
            });
            
            console.log(`   ✅ Can create spreadsheets via Drive API!`);
            console.log(`   Created: ${driveCreateResponse.data.name}`);
            console.log(`   ID: ${driveCreateResponse.data.id}`);
            console.log(`   URL: ${driveCreateResponse.data.webViewLink}`);
            
            // Clean up
            try {
                await drive.files.delete({ fileId: driveCreateResponse.data.id });
                console.log(`   ✅ Test sheet deleted\n`);
            } catch (e) {
                console.log(`   ⚠️  Could not delete test sheet\n`);
            }
        } catch (error) {
            console.error(`   ❌ Cannot create spreadsheets via Drive API: ${error.message}`);
            console.error(`   Error Code: ${error.code || 'N/A'}\n`);
        }

    } catch (error) {
        console.error('\n❌ Authentication Error:', error.message);
        process.exit(1);
    }
}

checkPermissions()
    .then(() => {
        console.log('✅ Check complete!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Check failed:', error);
        process.exit(1);
    });

