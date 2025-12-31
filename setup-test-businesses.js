// setup-test-businesses.js
// Script to set up test businesses for Phase 4 testing
// 
// Usage:
//   1. Make sure Firebase emulators are running
//   2. Set: $env:FIRESTORE_EMULATOR_HOST = "localhost:8080"
//   3. Run: node setup-test-businesses.js
//
// Note: Requires firebase-admin. Install with:
//   npm install firebase-admin --save-dev (in project root)
//   OR use from functions: node -r ./functions/node_modules/firebase-admin setup-test-businesses.js

const admin = require('./functions/node_modules/firebase-admin');

// Initialize Firebase Admin (for emulator)
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log('✅ Using Firestore Emulator:', process.env.FIRESTORE_EMULATOR_HOST);
} else {
  console.log('⚠️  WARNING: No FIRESTORE_EMULATOR_HOST set!');
  console.log('   This will write to PRODUCTION Firestore!');
  console.log('   Set: $env:FIRESTORE_EMULATOR_HOST = "localhost:8080"');
  console.log('   Press Ctrl+C to cancel, or continue in 2 seconds...\n');
  // Small delay to give user time to cancel
  setTimeout(() => {}, 2000);
}

// Initialize Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: '<YOUR_PROJECT_ID>'
  });
}

const db = admin.firestore();

// Test businesses data
const testBusinesses = [
  {
    entityId: 'business-a',
    name: 'Business A - Terry\'s Meat Shop',
    sheetName: 'Business A Receipts',
    users: [
      {
        email: 'terry@business-a.com',
        displayName: 'Terry (Business A)'
      }
    ]
  },
  {
    entityId: 'business-b',
    name: 'Business B - Test Company',
    sheetName: 'Business B Receipts',
    users: [
      {
        email: 'admin@business-b.com',
        displayName: 'Admin (Business B)'
      }
    ]
  },
  {
    entityId: 'business-c',
    name: 'Business C - Demo Corp',
    sheetName: 'Business C Receipts',
    users: [
      {
        email: 'demo@business-c.com',
        displayName: 'Demo User'
      }
    ]
  }
];

async function setupTestBusinesses() {
  console.log('\n🚀 Setting up test businesses...\n');

  try {
    for (const business of testBusinesses) {
      console.log(`📦 Setting up: ${business.name}`);
      
      // 1. Create entity in Firestore
      await db.collection('entities').doc(business.entityId).set({
        name: business.name,
        createdAt: new Date().toISOString(),
        testData: true
      });
      console.log(`   ✅ Entity created: ${business.entityId}`);

      // 2. Create users (in Firestore users collection)
      // Note: Actual auth users need to be created via UI or Auth API
      for (const user of business.users) {
        // Use email as document ID (replace @ with _at_ for valid ID)
        const userId = user.email.replace('@', '_at_').replace('.', '_');
        await db.collection('users').doc(userId).set({
          email: user.email,
          displayName: user.displayName,
          entity: business.entityId,
          createdAt: new Date().toISOString(),
          testData: true
        }, { merge: true });
        console.log(`   ✅ User document created: ${user.email}`);
      }

      // 3. Create sheet config
      // Note: For test data, we create placeholders. For real entities, auto-setup will create sheets automatically
      const configId = `config-${business.entityId}`;
      await db.collection('sheet_configs').doc(configId).set({
        name: business.sheetName,
        sheetId: `PLACEHOLDER-${business.entityId}`, // For test data - replace manually or let auto-setup handle real entities
        isDefault: false,
        createdAt: new Date().toISOString(),
        createdBy: 'setup-script',
        lastModified: new Date().toISOString(),
        config: {
          mainTabName: 'Sheet1',
          accountantTabName: 'Accountant_CSV_Ready',
          createTabsIfMissing: true,
          headerRow: 1
        },
        assignedTo: {
          type: 'entity',
          entityIds: [business.entityId]
        },
        status: 'active',
        testData: true,
        stats: {
          totalReceipts: 0
        }
      });
      console.log(`   ✅ Sheet config created: ${configId}`);

      // 4. Assign sheet to entity
      await db.collection('entities').doc(business.entityId).update({
        sheetConfigId: configId,
        lastModified: new Date().toISOString()
      });
      console.log(`   ✅ Sheet assigned to entity\n`);
    }

    console.log('✅ All test businesses set up!\n');
    console.log('📝 Next steps:');
    console.log('   1. Create Google Sheets for each business');
    console.log('   2. Share sheets with: <SERVICE_ACCOUNT_EMAIL>');
    console.log('   3. Update sheet IDs in Firestore (sheet_configs collection)');
    console.log('   4. Create auth users in Emulator UI (http://127.0.0.1:4000)');
    console.log('   5. Test receipt routing!\n');
    console.log('📖 See PHASE4_TEST_SETUP.md for detailed instructions\n');

  } catch (error) {
    console.error('❌ Error setting up businesses:', error);
    throw error;
  }
}

// Run setup
setupTestBusinesses()
  .then(() => {
    console.log('✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
