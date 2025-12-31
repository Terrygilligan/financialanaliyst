// verify-folder-id.js
// Verify the folder ID is set and accessible

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'functions', '.env') });

const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

console.log('\n🔍 Verifying Google Drive Folder ID...\n');

if (!folderId) {
    console.error('❌ GOOGLE_DRIVE_FOLDER_ID not found in functions/.env');
    console.log('\n📝 Add this line to functions/.env:');
    console.log('   GOOGLE_DRIVE_FOLDER_ID=1G7eq1KyH4cnvTPT4huBqph_b_rPo3Xwg\n');
    process.exit(1);
}

console.log(`✅ Folder ID found: ${folderId}`);
console.log(`   Expected: 1G7eq1KyH4cnvTPT4huBqph_b_rPo3Xwg\n`);

if (folderId === '1G7eq1KyH4cnvTPT4huBqph_b_rPo3Xwg') {
    console.log('✅ Folder ID matches!\n');
    console.log('📋 Next steps:');
    console.log('   1. Make sure the folder is shared with:');
    console.log('      financial-output@financialanaliyst.iam.gserviceaccount.com');
    console.log('      Role: Editor\n');
    console.log('   2. Rebuild and deploy:');
    console.log('      cd functions');
    console.log('      npm run build');
    console.log('      firebase deploy --only functions\n');
} else {
    console.log('⚠️  Folder ID does not match expected value');
    console.log('   Make sure you copied the correct folder ID from the URL\n');
}

