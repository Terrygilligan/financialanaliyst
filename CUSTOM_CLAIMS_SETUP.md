# Custom Claims Setup Guide - Admin Access

## 📋 Overview

This guide explains how to set up admin access using **Firebase Custom Claims**, which is the recommended, most secure approach for role-based access control.

---

## 🎯 Why Custom Claims?

| Feature | Firestore Collection | Custom Claims ✅ |
|---------|----------------------|------------------|
| **Performance** | Extra Firestore read per check | Instant (no reads) |
| **Security** | Client-side check | Server-validated |
| **Complexity** | Complex Firestore rules | Simple token check |
| **Scalability** | Slower with many users | Fast regardless of scale |

**Custom Claims are included in the user's ID token**, so the check is instant and secure.

---

## 🚀 Step 1: Deploy Cloud Functions

The Cloud Functions for setting admin claims are already included in `functions/src/index.ts`:

- `setAdminClaim` - Grants admin privileges to a user
- `removeAdminClaim` - Removes admin privileges from a user

**Deploy the functions:**

```bash
cd functions
npm run build
firebase deploy --only functions
```

---

## 🔐 Step 2: Set Admin Claim for First User

### Option A: Using Firebase Console (Recommended for First Admin)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **financialanaliyst**
3. Go to **Authentication** → **Users**
4. Find the user you want to make admin
5. Copy their **UID** (User ID)

### Option B: Using Cloud Function Call

You can call the Cloud Function directly. Here are several methods:

#### Method 1: Using Firebase CLI

```bash
# Get your user's UID from Firebase Console → Authentication → Users
firebase functions:call setAdminClaim --data '{"uid":"YOUR_USER_UID_HERE"}'
```

#### Method 2: Using HTTP Request (Postman/curl)

```bash
# First, get your Firebase project's function URL
# Then make a POST request with your auth token

curl -X POST \
  https://us-central1-financialanaliyst.cloudfunctions.net/setAdminClaim \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{"data":{"uid":"YOUR_USER_UID_HERE"}}'
```

#### Method 3: Using Node.js Script

Create a file `set-admin.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const targetUserId = 'YOUR_USER_UID_HERE';

admin.auth().setCustomUserClaims(targetUserId, { admin: true })
  .then(() => {
    console.log(`✅ Admin claim set for user: ${targetUserId}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
```

Run it:
```bash
node set-admin.js
```

#### Method 4: Using Firebase Admin SDK in Cloud Shell

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Open Cloud Shell
3. Run:

```javascript
// In Cloud Shell, you can use the Firebase Admin SDK directly
const admin = require('firebase-admin');
admin.initializeApp();
const targetUserId = 'YOUR_USER_UID_HERE';
await admin.auth().setCustomUserClaims(targetUserId, { admin: true });
console.log('Admin claim set!');
```

---

## ✅ Step 3: Verify Admin Claim

### Check in Firebase Console

1. Go to **Authentication** → **Users**
2. Click on the user
3. Look for **Custom claims** section
4. You should see: `{"admin": true}`

### Test in Your App

1. **Important**: The user must **sign out and sign back in** for the custom claim to take effect
2. After signing back in, the admin link should appear in navigation
3. Accessing `/admin.html` should work without "Access Denied"

---

## 🔄 Step 4: Add More Admins

Once you have one admin, you can:

1. **Use the Cloud Function** (if you added the caller verification, only existing admins can grant admin)
2. **Use any of the methods above** to set claims for additional users

### Using the Cloud Function from Your App (Future Enhancement)

You could add a UI in the admin dashboard to grant admin privileges:

```javascript
// In admin.js (future enhancement)
async function grantAdmin(userId) {
    const setAdminClaim = httpsCallable(functions, 'setAdminClaim');
    try {
        await setAdminClaim({ uid: userId });
        alert('Admin privileges granted!');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
```

---

## 🗑️ Step 5: Remove Admin Privileges

To remove admin privileges from a user:

### Using Cloud Function

```bash
firebase functions:call removeAdminClaim --data '{"uid":"USER_UID_HERE"}'
```

### Using Node.js Script

```javascript
const admin = require('firebase-admin');
// ... initialize admin SDK ...

await admin.auth().setCustomUserClaims(targetUserId, { admin: false });
// Or remove the claim entirely:
await admin.auth().setCustomUserClaims(targetUserId, null);
```

---

## 🔧 Troubleshooting

### Admin Link Not Showing

**Problem**: Admin link doesn't appear after setting claim

**Solutions**:
1. ✅ **User must sign out and sign back in** (most common issue)
2. Check browser console for errors
3. Verify the claim is set in Firebase Console → Authentication → Users
4. Try forcing token refresh: `await user.getIdToken(true)`

### "Access Denied" on Admin Page

**Problem**: Getting "Access Denied" even after setting claim

**Solutions**:
1. Ensure user signed out and signed back in
2. Check that `request.auth.token.admin == true` in Firestore rules
3. Verify the claim in Firebase Console
4. Clear browser cache and try again

### Custom Claim Not in Token

**Problem**: Claim is set but not appearing in ID token

**Solutions**:
1. Force token refresh: `await user.getIdToken(true)`
2. Sign out and sign back in
3. Check that the claim was set correctly in Firebase Console
4. Wait a few seconds - claims can take a moment to propagate

---

## 📝 Quick Setup Checklist

- [ ] Deploy Cloud Functions (`firebase deploy --only functions`)
- [ ] Get target user's UID from Firebase Console
- [ ] Set admin claim using one of the methods above
- [ ] Verify claim in Firebase Console → Authentication → Users
- [ ] User signs out and signs back in
- [ ] Test admin access in the app
- [ ] Verify admin link appears in navigation
- [ ] Test admin dashboard access

---

## 🔒 Security Notes

- **Custom claims are server-validated** - Users cannot spoof them
- **Claims are included in ID tokens** - No extra Firestore reads needed
- **Claims persist** - Once set, they remain until explicitly removed
- **Token refresh required** - Users must get a new token to see updated claims

---

## 📚 Related Documentation

- `FIRESTORE_RULES_CUSTOM_CLAIMS.md` - Updated Firestore security rules
- `functions/src/index.ts` - Cloud Functions implementation
- `ADMIN_SETUP.md` - Original setup guide (deprecated, use this instead)

---

**Last Updated**: Custom Claims Implementation
**Status**: ✅ Recommended Approach
