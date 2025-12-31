// fix-sheet-ids.js
// Fix invalid sheet IDs in Firestore (extract ID from URLs)

const admin = require('./functions/node_modules/firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'functions', '.env') });

// Initialize Firebase Admin
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log('✅ Using Firestore Emulator:', process.env.FIRESTORE_EMULATOR_HOST);
} else {
  console.log('⚠️  WARNING: No FIRESTORE_EMULATOR_HOST set!');
  console.log('   This will modify PRODUCTION Firestore!');
  console.log('   Set: $env:FIRESTORE_EMULATOR_HOST = "localhost:8080"');
  console.log('   Press Ctrl+C to cancel, or continue in 2 seconds...\n');
  setTimeout(() => {}, 2000);
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: '<YOUR_PROJECT_ID>'
  });
}

const db = admin.firestore();

function extractSheetId(input) {
    if (!input) return '';
    
    const trimmed = input.trim();
    
    // If it's already just an ID (no slashes, no query params), return as-is
    if (!trimmed.includes('/') && !trimmed.includes('?') && !trimmed.includes('#')) {
        return trimmed;
    }
    
    // Try to extract from Google Sheets URL
    const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
        return urlMatch[1];
    }
    
    // Try to extract from partial URL (just the ID part before /edit)
    const idMatch = trimmed.match(/^([a-zA-Z0-9-_]+)(?:\/|$)/);
    if (idMatch) {
        return idMatch[1];
    }
    
    // If all else fails, try to get the first part before any special characters
    const firstPart = trimmed.split(/[\/\?#]/)[0];
    if (firstPart && firstPart.length > 10) {
        return firstPart;
    }
    
    return trimmed; // Fallback: return as-is
}

async function fixSheetIds() {
    console.log('\n🔧 Fixing Sheet IDs in Firestore...\n');

    try {
        const snapshot = await db.collection('sheet_configs').get();
        
        if (snapshot.empty) {
            console.log('No configs to fix\n');
            return;
        }

        const batch = db.batch();
        let fixedCount = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const currentSheetId = data.sheetId || '';
            const extractedId = extractSheetId(currentSheetId);
            
            if (currentSheetId !== extractedId) {
                console.log(`Fixing: ${doc.id}`);
                console.log(`  Old: ${currentSheetId}`);
                console.log(`  New: ${extractedId}\n`);
                
                batch.update(doc.ref, {
                    sheetId: extractedId,
                    lastModified: new Date().toISOString()
                });
                fixedCount++;
            }
        });

        if (fixedCount > 0) {
            await batch.commit();
            console.log(`✅ Fixed ${fixedCount} sheet IDs\n`);
        } else {
            console.log('✅ All sheet IDs are already valid\n');
        }

    } catch (error) {
        console.error('❌ Error fixing sheet IDs:', error);
        process.exit(1);
    }
}

fixSheetIds()
    .then(() => {
        console.log('✅ Fix complete!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Fix failed:', error);
        process.exit(1);
    });

