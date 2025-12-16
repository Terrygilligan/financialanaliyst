# Updated Firestore Security Rules

## 📋 Overview

This document contains the updated Firestore security rules that support:
- User profile pages
- Admin dashboard access
- Existing batch/receipt functionality

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
    
    // Admin collection - only admins can read
    match /admins/{email} {
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
      // Optional: Allow admins to write (for self-service admin management)
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
    }
    
    // User profile collection (optional - for future enhancements)
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
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

### 2. Admins Collection (`/admins/{email}`)
- **Purpose**: Stores admin email addresses for access control
- **Read Access**: Only users whose email exists in the admins collection can read
- **Write Access**: Only admins can write (optional, for self-service management)
- **Security**: Checks if authenticated user's email exists as a document ID in admins collection

### 3. Users Collection (`/users/{userId}`)
- **Purpose**: Optional collection for user profile data
- **Access**: Users can only read/write their own user document
- **Security**: User ID in path must match authenticated user ID

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

1. **User Access**: Log in and verify you can see your own batch data
2. **Admin Access**: Log in as admin and verify you can access admin dashboard
3. **Non-Admin Access**: Log in as non-admin and verify you cannot access admin features
4. **Unauthorized Access**: Try accessing another user's batch (should fail)

---

## 🔧 Troubleshooting

### Rules Not Working

- Wait 10-20 seconds after publishing for rules to propagate
- Clear browser cache
- Check browser console for specific error messages
- Verify you're logged in with the correct account

### Admin Access Denied

- Verify admin email in Firestore matches login email exactly
- Check that admin document exists in `admins` collection
- Ensure rules are published (not just saved as draft)

---

## 📚 Related Documentation

- `ADMIN_SETUP.md` - How to set up admin users
- `PROFILE_AND_ADMIN_PLAN.md` - Implementation plan
- `FIRESTORE_RULES.md` - Original rules documentation

---

**Last Updated**: Profile & Admin Dashboard Implementation
**Status**: Ready for deployment
