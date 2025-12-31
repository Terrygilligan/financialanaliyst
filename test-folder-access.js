// test-folder-access.js
// Test if service account can access the folder

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'functions', '.env') });

async function testFolderAccess() {
    console.log('\n🔍 Testing Service Account Access to Drive Folder...\n');

    const serviceAccountKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    if (!serviceAccountKey) {
        console.error('❌ GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY not found');
        process.exit(1);
    }
    
    if (!folderId) {
        console.error('❌ GOOGLE_DRIVE_FOLDER_ID not found');
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
    console.log(`📧 Service Account: ${serviceAccountEmail}`);
    console.log(`📁 Folder ID: ${folderId}\n`);

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: [
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.file'
            ],
        });

        const drive = google.drive({ version: 'v3', auth });

        // Test 1: Check if we can access the folder
        console.log('📁 Test 1: Checking folder access...');
        try {
            const folder = await drive.files.get({
                fileId: folderId,
                fields: 'id, name, permissions, shared'
            });
            
            console.log(`   ✅ Folder accessible: ${folder.data.name}`);
            console.log(`   Folder ID: ${folder.data.id}`);
            console.log(`   Shared: ${folder.data.shared ? 'Yes' : 'No'}\n`);
            
            // Check permissions
            if (folder.data.permissions) {
                const serviceAccountPermission = folder.data.permissions.find(
                    (p) => p.emailAddress === serviceAccountEmail
                );
                
                if (serviceAccountPermission) {
                    console.log(`   ✅ Service account has access!`);
                    console.log(`   Role: ${serviceAccountPermission.role}`);
                    console.log(`   Type: ${serviceAccountPermission.type}\n`);
                    
                    if (serviceAccountPermission.role === 'writer' || serviceAccountPermission.role === 'owner') {
                        console.log('   ✅ Permission level is correct (Editor/Owner)\n');
                    } else {
                        console.log(`   ⚠️  Permission level might be too low: ${serviceAccountPermission.role}`);
                        console.log('   Should be "writer" (Editor) or "owner"\n');
                    }
                } else {
                    console.log(`   ❌ Service account NOT found in permissions!`);
                    console.log('   You need to share the folder with the service account.\n');
                }
            }
        } catch (error) {
            console.error(`   ❌ Cannot access folder: ${error.message}`);
            if (error.code === 404) {
                console.log('   → Folder not found or service account does not have access');
                console.log('   → Share the folder with the service account\n');
            } else if (error.code === 403) {
                console.log('   → Permission denied');
                console.log('   → Make sure the folder is shared with Editor access\n');
            }
        }

        // Test 2: Try to create a test file in the folder
        console.log('📝 Test 2: Testing file creation in folder...');
        try {
            const testFile = await drive.files.create({
                requestBody: {
                    name: 'Test File ' + Date.now() + '.txt',
                    mimeType: 'text/plain',
                    parents: [folderId]
                },
                media: {
                    mimeType: 'text/plain',
                    body: 'Test content'
                },
                fields: 'id, name'
            });
            
            console.log(`   ✅ Can create files in folder!`);
            console.log(`   Created: ${testFile.data.name} (${testFile.data.id})`);
            
            // Clean up
            try {
                await drive.files.delete({ fileId: testFile.data.id });
                console.log('   ✅ Test file deleted\n');
            } catch (e) {
                console.log(`   ⚠️  Could not delete test file\n`);
            }
        } catch (error) {
            console.error(`   ❌ Cannot create files: ${error.message}`);
            console.error(`   Error Code: ${error.code || 'N/A'}\n`);
            
            if (error.code === 403) {
                console.log('   🔧 SOLUTION:');
                console.log('   1. Open the folder in Google Drive');
                console.log('   2. Click "Share"');
                console.log(`   3. Add: ${serviceAccountEmail}`);
                console.log('   4. Set role to: Editor');
                console.log('   5. Click "Share"\n');
            }
        }

    } catch (error) {
        console.error('\n❌ Authentication Error:', error.message);
        process.exit(1);
    }
}

testFolderAccess()
    .then(() => {
        console.log('✅ Test complete!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });

