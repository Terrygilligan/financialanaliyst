// test-silo-isolation.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { initializeApp: initializeClientApp } = require('@firebase/app');
const { getFirestore, doc, getDoc } = require('@firebase/firestore');
const { getAuth: getClientAuth, signInWithCustomToken } = require('@firebase/auth');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, 'functions/.env') });

if (!process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY) {
    console.error("FATAL: GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY not found in environment variables.");
    process.exit(1);
}

const serviceAccount = JSON.parse(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY);

// --- Admin App Initialization ---
const adminApp = initializeApp({
  credential: cert(serviceAccount),
});
const adminAuth = getAuth(adminApp);

// --- Client App Configuration ---
// Note: This requires your frontend firebase-config.js to be in a format we can require
// For this test, we'll manually create the config object.
const { firebaseConfig } = require('./public/firebase-config.js');
const clientConfig = firebaseConfig;

// --- Test Parameters ---
const BUSINESS_A_ID = 'business-A';
const SECRET_BIZ_ID = 'secret-business-B';
const USER_A_UID = 'test-user-for-business-A';

async function runTest() {
    console.log('--- Running Data Silo Isolation Test ---');

    // 1. Mint a custom token for a user in Business A
    console.log(`Minting token for user ${USER_A_UID} in business ${BUSINESS_A_ID}...`);
    const customToken = await adminAuth.createCustomToken(USER_A_UID, { businessId: BUSINESS_A_ID });
    console.log('Token minted successfully.');

    // 2. Initialize a client-side Firebase app and sign in
    console.log('Initializing client app and signing in...');
    const clientApp = initializeClientApp(clientConfig);
    const clientAuth = getClientAuth(clientApp);
    await signInWithCustomToken(clientAuth, customToken);
    console.log('Client signed in successfully.');

    const db = getFirestore(clientApp);

    // 3. Attempt to query data from the SECRET business
    const docRef = doc(db, `businesses/${SECRET_BIZ_ID}/receipts/some-receipt`);
    console.log(`Attempting to read from: ${docRef.path}`);

    try {
        await getDoc(docRef);
        // If this line is reached, the read succeeded, which is a security failure
        console.error('--- ❌ TEST FAILED: Cross-tenant data access was successful! ---');
        process.exit(1);
    } catch (error) {
        // Check if the error is the one we expect
        if (error.code === 'permission-denied') {
            console.log('--- ✅ TEST PASSED: Firestore permission denied as expected. ---');
            process.exit(0);
        } else {
            // A different error occurred
            console.error('--- ❌ TEST FAILED: An unexpected error occurred ---');
            console.error(error);
            process.exit(1);
        }
    }
}

// Check if firebaseConfig is placeholder
if (clientConfig.apiKey === 'your-api-key') {
    console.error('--- 🛑 ERROR: Please update test-silo-isolation.js with your firebaseConfig from public/firebase-config.js ---');
    process.exit(1);
} else {
    runTest();
}
