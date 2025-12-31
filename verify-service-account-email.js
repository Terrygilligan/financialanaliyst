// verify-service-account-email.js
// Verify which service account is in the environment variable

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'functions', '.env') });

const serviceAccountKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
    console.error('❌ GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY not found in environment');
    process.exit(1);
}

try {
    const credentials = typeof serviceAccountKey === 'string' 
        ? JSON.parse(serviceAccountKey) 
        : serviceAccountKey;
    
    console.log('\n🔍 Service Account Details:\n');
    console.log(`Email: ${credentials.client_email}`);
    console.log(`Project ID: ${credentials.project_id}`);
    console.log(`Type: ${credentials.type}`);
    console.log(`\n✅ This is the service account that should have Owner/Editor role in IAM`);
    console.log(`   Expected: financial-output@financialanaliyst.iam.gserviceaccount.com\n`);
    
    if (credentials.client_email !== 'financial-output@financialanaliyst.iam.gserviceaccount.com') {
        console.log('⚠️  WARNING: Service account email does not match expected!');
        console.log(`   Expected: financial-output@financialanaliyst.iam.gserviceaccount.com`);
        console.log(`   Found: ${credentials.client_email}`);
        console.log(`\n   Make sure you granted permissions to: ${credentials.client_email}\n`);
    } else {
        console.log('✅ Service account email matches expected value\n');
    }
    
} catch (error) {
    console.error('❌ Failed to parse service account key:', error.message);
    process.exit(1);
}

