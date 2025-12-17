// Quick Admin Setup Script
// This script adds admin access for a user in Firebase/Firestore

const admin = require('firebase-admin');
const serviceAccount = require('./functions/.env'); // We'll use existing credentials

// If using emulator, uncomment this:
// process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'financialanaliyst'
});

const db = admin.firestore();

async function setupAdmin(email) {
  try {
    console.log(`\n🔐 Setting up admin access for: ${email}\n`);
    
    // Step 1: Add to Firestore 'admins' collection
    console.log('Step 1: Adding to Firestore admins collection...');
    await db.collection('admins').doc(email).set({
      email: email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      role: 'admin',
      setupBy: 'setup-script',
      setupAt: new Date().toISOString()
    });
    console.log('✅ Added to Firestore admins collection');
    
    // Step 2: Try to find user by email and set custom claims (optional, more secure)
    console.log('\nStep 2: Setting custom claims (if user exists)...');
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
      console.log(`✅ Custom claim set for user UID: ${userRecord.uid}`);
      console.log('⚠️  User must sign out and sign back in to see admin access');
    } catch (authError) {
      console.log('ℹ️  User not found in Auth (they may not have signed up yet)');
      console.log('   Admin access will work once they sign up with this email');
    }
    
    console.log('\n✅ Admin setup complete!\n');
    console.log('Next steps:');
    console.log('1. Log in to the app with: ' + email);
    console.log('2. If already logged in, sign out and sign back in');
    console.log('3. You should see the Admin link in navigation');
    console.log('4. Navigate to /admin.html to access the admin dashboard\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error setting up admin:', error);
    console.error('\nTroubleshooting:');
    console.error('- Ensure Firebase credentials are configured');
    console.error('- Check that you have the right permissions');
    console.error('- If using emulators, uncomment the emulator line in this script\n');
    process.exit(1);
  }
}

// Run the setup
const adminEmail = process.argv[2] || 'terrythemeat@duck.com';
setupAdmin(adminEmail);

