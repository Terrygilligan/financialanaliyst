// check-sheet-configs.js
// Diagnostic script to check sheet configs in Firestore

const admin = require('./functions/node_modules/firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'functions', '.env') });

// Initialize Firebase Admin (for emulator)
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log('✅ Using Firestore Emulator:', process.env.FIRESTORE_EMULATOR_HOST);
} else {
  console.log('⚠️  WARNING: No FIRESTORE_EMULATOR_HOST set!');
  console.log('   This will read from PRODUCTION Firestore!');
  console.log('   Set: $env:FIRESTORE_EMULATOR_HOST = "localhost:8080"');
  console.log('   Press Ctrl+C to cancel, or continue in 2 seconds...\n');
  setTimeout(() => {}, 2000);
}

// Initialize Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'financialanaliyst'
  });
}

const db = admin.firestore();

async function checkSheetConfigs() {
    console.log('\n🔍 Checking Sheet Configs in Firestore...\n');

    try {
        // Get ALL configs (no filter)
        const allSnapshot = await db.collection('sheet_configs').get();
        console.log(`📊 Total configs in collection: ${allSnapshot.size}\n`);

        if (allSnapshot.empty) {
            console.log('❌ No sheet configs found in Firestore');
            console.log('   The collection might be empty or the configs weren\'t saved.\n');
            return;
        }

        // List all configs
        allSnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`Config ${index + 1}:`);
            console.log(`  ID: ${doc.id}`);
            console.log(`  Name: ${data.name || 'N/A'}`);
            console.log(`  Sheet ID: ${data.sheetId || 'N/A'}`);
            console.log(`  Status: ${data.status || 'N/A'}`);
            console.log(`  Is Default: ${data.isDefault || false}`);
            console.log(`  Created: ${data.createdAt || 'N/A'}`);
            console.log('');
        });

        // Check active configs specifically
        const activeSnapshot = await db.collection('sheet_configs')
            .where('status', '==', 'active')
            .get();
        
        console.log(`✅ Active configs: ${activeSnapshot.size}\n`);

        // Check if there's an index issue
        if (allSnapshot.size > 0 && activeSnapshot.size === 0) {
            console.log('⚠️  WARNING: Configs exist but none are marked as "active"');
            console.log('   Check the status field in the configs above.\n');
        }

        // Try the query with orderBy (this might fail if index is missing)
        try {
            const orderedSnapshot = await db.collection('sheet_configs')
                .where('status', '==', 'active')
                .orderBy('name')
                .get();
            console.log(`✅ Query with orderBy works: ${orderedSnapshot.size} results\n`);
        } catch (error) {
            console.log('❌ Query with orderBy failed (index missing?):');
            console.log(`   ${error.message}\n`);
            console.log('🔧 Fix: Create a Firestore index:');
            console.log('   Collection: sheet_configs');
            console.log('   Fields: status (Ascending), name (Ascending)\n');
        }

    } catch (error) {
        console.error('❌ Error checking configs:', error);
        process.exit(1);
    }
}

checkSheetConfigs()
    .then(() => {
        console.log('✅ Check complete!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Check failed:', error);
        process.exit(1);
    });

