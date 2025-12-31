// scripts/seed-admin-tenant.js
// Script to assign businessId custom claims to an admin user

const admin = require('firebase-admin');

// Initialize Firebase Admin (Uses Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS)
admin.initializeApp({
  projectId: 'financialanaliyst'
});

const auth = admin.auth();
const db = admin.firestore();

// --- CONFIGURATION ---
const ADMIN_EMAILS = ['consolegames2010@hotmail.com', 'terrythemeat@duck.com']; 
const FIRST_BUSINESS_ID = 'business_001';   
// ---------------------

async function seedAdmin() {
  try {
    for (const email of ADMIN_EMAILS) {
      console.log(`🚀 Starting tenant seeding for ${email}...`);

      try {
        // 1. Find the user by email
        const user = await auth.getUserByEmail(email);
        const uid = user.uid;
        console.log(`✅ Found user with UID: ${uid}`);

        // 2. Set Custom Claims
        const existingClaims = user.customClaims || {};
        await auth.setCustomUserClaims(uid, { 
          ...existingClaims,
          admin: true, 
          businessId: FIRST_BUSINESS_ID 
        });
        console.log(`✅ Custom claims set for ${email}`);

        // 3. Update Firestore User Document
        await db.collection('users').doc(uid).set({
          email: email,
          businessId: FIRST_BUSINESS_ID,
          role: 'admin',
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`✅ Firestore user document updated for ${email}`);
      } catch (userError) {
        console.error(`❌ Error processing ${email}:`, userError.message);
      }
    }
    
    // 4. Create the initial Business document
    await db.collection('businesses').doc(FIRST_BUSINESS_ID).set({
      name: 'Main Admin Office',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    }, { merge: true });
    console.log(`✅ Firestore business document updated.`);

    console.log(`\n🎉 SUCCESS! Please sign out and sign back into the app with your Google account for the changes to take effect.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Global seeding error:', error);
    process.exit(1);
  }
}

seedAdmin();

