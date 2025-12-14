// Verify Environment Variables Configuration
// Run: node verify-env-vars.js

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'functions', '.env') });

console.log('🔍 Verifying Environment Variables Configuration...\n');

const requiredVars = {
    'GOOGLE_SHEET_ID': {
        required: true,
        description: 'Google Sheet ID for writing receipt data'
    },
    'GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY': {
        required: true,
        description: 'Service Account JSON key for Google Sheets API'
    },
    'GEMINI_API_KEY': {
        required: true,
        description: 'Gemini API key for AI extraction'
    }
};

let allValid = true;
const results = [];

for (const [varName, config] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    const exists = value !== undefined && value !== '';
    
    if (config.required && !exists) {
        allValid = false;
        results.push({
            name: varName,
            status: '❌ MISSING',
            message: `Required but not set`
        });
    } else if (exists) {
        // Validate format
        let isValid = true;
        let message = '✅ Set';
        
        if (varName === 'GOOGLE_SHEET_ID') {
            // Sheet ID should be a string (no spaces, typically alphanumeric with dashes/underscores)
            if (value.length < 10) {
                isValid = false;
                message = '⚠️  Value seems too short (should be ~40+ characters)';
            } else {
                message = `✅ Set (${value.substring(0, 20)}...)`;
            }
        } else if (varName === 'GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY') {
            // Should be valid JSON
            try {
                const parsed = JSON.parse(value);
                if (!parsed.client_email || !parsed.private_key) {
                    isValid = false;
                    message = '⚠️  JSON missing required fields (client_email, private_key)';
                } else {
                    message = `✅ Valid JSON (Service Account: ${parsed.client_email})`;
                }
            } catch (e) {
                isValid = false;
                message = '⚠️  Invalid JSON format';
            }
        } else if (varName === 'GEMINI_API_KEY') {
            // API key should start with AIza
            if (!value.startsWith('AIza')) {
                isValid = false;
                message = '⚠️  Value does not look like a valid API key (should start with AIza)';
            } else {
                message = `✅ Set (${value.substring(0, 10)}...)`;
            }
        }
        
        if (!isValid) {
            allValid = false;
        }
        
        results.push({
            name: varName,
            status: isValid ? '✅' : '⚠️',
            message: message
        });
    } else {
        results.push({
            name: varName,
            status: '⏭️  OPTIONAL',
            message: 'Not set (optional)'
        });
    }
}

// Display results
console.log('Environment Variables Status:\n');
results.forEach(result => {
    console.log(`${result.status} ${result.name}`);
    console.log(`   ${result.message}\n`);
});

// Summary
console.log('─'.repeat(60));
if (allValid) {
    console.log('✅ All required environment variables are configured correctly!');
    console.log('\n📋 Next Steps:');
    console.log('1. Verify Google Sheet is shared with Service Account');
    console.log('2. Verify Sheet headers match expected format');
    console.log('3. Deploy function: firebase deploy --only functions');
} else {
    console.log('❌ Some environment variables are missing or invalid.');
    console.log('\n📋 Action Required:');
    console.log('1. Check functions/.env file');
    console.log('2. Ensure all required variables are set');
    console.log('3. Verify variable formats are correct');
    console.log('\n💡 For production, you may also need to set these in Firebase Functions config.');
}

console.log('\n📝 Service Account Email (from GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY):');
try {
    const saKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
    if (saKey) {
        const parsed = JSON.parse(saKey);
        console.log(`   ${parsed.client_email}`);
        console.log('\n⚠️  Make sure this email has Editor access to your Google Sheet!');
    }
} catch (e) {
    console.log('   (Could not parse Service Account key)');
}

console.log('\n📝 Google Sheet ID:');
const sheetId = process.env.GOOGLE_SHEET_ID;
if (sheetId) {
    console.log(`   ${sheetId}`);
    console.log(`   URL: https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
}
