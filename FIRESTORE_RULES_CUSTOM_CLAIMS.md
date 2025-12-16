# Firestore Security Rules - Custom Claims Version

## 📋 Overview

This document contains the updated Firestore security rules that use **Firebase Custom Claims** for admin access control. This is the recommended, more secure approach.

---

## 🔒 Complete Security Rules

Copy and paste these rules into Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own batch documents
    match /batches/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User statistics collection - users can read their own stats
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      // Only admins can write (for system updates via Cloud Functions)
      allow write: if request.auth != null && 
        (request.auth.uid == userId || request.auth.token.admin == true);
    }
    
    // Admin-only collections (if needed in the future)
    match /admin_data/{document=**} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

---

## 📝 Rule Explanations

### 1. Batches Collection (`/batches/{userId}`)
- **Purpose**: Stores receipt processing status for each user
- **Access**: Users can only read/write their own batch document
- **Security**: User ID in path must match authenticated user ID

### 2. Users Collection (`/users/{userId}`)
- **Purpose**: Stores user statistics (total receipts, total amount, etc.)
- **Read Access**: Users can read their own statistics
- **Write Access**: Users can write their own stats OR admins can write (for Cloud Function updates)
- **Security**: User ID in path must match authenticated user ID, OR user must have admin custom claim

### 3. Admin Data Collection (`/admin_data/{document=**}`)
- **Purpose**: Optional collection for admin-only data
- **Access**: Only users with `admin: true` custom claim can read/write
- **Security**: Checks `request.auth.token.admin == true`

---

## 🔑 Key Difference: Custom Claims vs Firestore Collection

### Old Approach (Firestore Collection)
```javascript
// Client-side check (slow, extra Firestore read)
const adminRef = doc(db, 'admins', user.email);
const adminSnap = await getDoc(adminRef);
const isAdmin = adminSnap.exists();

// Firestore rule
match /admins/{email} {
  allow read: if exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
}
```

### New Approach (Custom Claims) ✅
```javascript
// Client-side check (instant, no Firestore read)
const idTokenResult = await user.getIdTokenResult();
const isAdmin = idTokenResult.claims.admin === true;

// Firestore rule (simpler, server-validated)
match /admin_data/{document=**} {
  allow read, write: if request.auth.token.admin == true;
}
```

**Benefits:**
- ✅ **Zero extra Firestore reads** - Check is instant
- ✅ **Server-validated** - Claims are set server-side, can't be spoofed
- ✅ **Simpler rules** - No need for complex existence checks
- ✅ **Better performance** - No network request needed

---

## 🚀 How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **financialanaliyst**
3. Click **Firestore Database** in the left menu
4. Click the **Rules** tab
5. Replace the existing rules with the rules above
6. Click **Publish**
7. Wait 10-20 seconds for rules to propagate

---

## ✅ Testing Rules

After publishing, test the rules:

1. **User Access**: Log in and verify you can see your own batch and user data
2. **Admin Access**: Log in as admin and verify you can access admin features
3. **Non-Admin Access**: Log in as non-admin and verify you cannot access admin data
4. **Unauthorized Access**: Try accessing another user's batch (should fail)

---

## 🔧 Troubleshooting

### Rules Not Working

- Wait 10-20 seconds after publishing for rules to propagate
- Clear browser cache
- Check browser console for specific error messages
- Verify you're logged in with the correct account

### Custom Claims Not Working

- Ensure you've set the custom claim using the Cloud Function
- User may need to **sign out and sign back in** for claims to refresh
- Check that the Cloud Function `setAdminClaim` is deployed
- Verify the claim is set: Check in Firebase Console → Authentication → Users

---

## 📚 Related Documentation

- `CUSTOM_CLAIMS_SETUP.md` - How to set up admin custom claims
- `ADMIN_SETUP.md` - Original admin setup (now deprecated in favor of custom claims)
- `PROFILE_AND_ADMIN_PLAN.md` - Implementation plan

---

**Last Updated**: Custom Claims Implementation
**Status**: ✅ Recommended Approach
