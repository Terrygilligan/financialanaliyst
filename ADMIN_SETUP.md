# Admin Dashboard Setup Guide

## 📋 Overview

This guide explains how to set up admin access for the Admin Dashboard feature.

---

## 🔐 Setting Up Admin Access

### Step 1: Create Admin Collection in Firestore

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **financialanaliyst**
3. Click **Firestore Database** in the left menu
4. Click **Start collection** (if Firestore is empty) or click **Add collection**
5. Collection ID: `admins`
6. Click **Next**

### Step 2: Add Admin User

1. In the `admins` collection, click **Add document**
2. **Document ID**: Enter the admin's email address (e.g., `admin@example.com`)
3. Add fields:
   - Field: `email`, Type: `string`, Value: `admin@example.com`
   - Field: `createdAt`, Type: `timestamp`, Value: (current timestamp)
   - Field: `role`, Type: `string`, Value: `admin` (optional)
4. Click **Save**

### Step 3: Repeat for Additional Admins

Add one document per admin user, using their email address as the document ID.

---

## 🔒 Firestore Security Rules

Update your Firestore security rules to allow admin access:

### Go to Firestore Rules

1. In Firebase Console → Firestore Database
2. Click the **Rules** tab
3. Replace the existing rules with:

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
      // Only admins can write (optional - for self-service admin management)
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

4. Click **Publish**

---

## ✅ Verifying Admin Access

### Test Admin Access

1. Log in to the app with an admin email address
2. You should see an **Admin** link in the navigation
3. Click the **Admin** link to access the admin dashboard
4. If you don't see the link, verify:
   - The email in Firestore `admins` collection matches your login email exactly
   - Firestore security rules are published
   - You've refreshed the page after logging in

### Test Non-Admin Access

1. Log in with a non-admin email address
2. You should **NOT** see the Admin link
3. If you try to access `/admin.html` directly, you'll see an "Access Denied" message

---

## 🛠️ Admin Dashboard Features

Once set up, admins can:

1. **View System Statistics**
   - Total receipts processed
   - Success rate
   - Total amount processed
   - Active users count

2. **View All Receipts**
   - See receipts from all users
   - Search and filter functionality
   - Sort by date, status, etc.

3. **View Error Logs**
   - All processing errors
   - Error details and timestamps
   - User information for each error

4. **User Management**
   - List all users
   - User statistics
   - Activity tracking

5. **Analytics**
   - Charts showing receipts by category
   - Status distribution
   - Visual data representation

---

## 🔧 Troubleshooting

### Admin Link Not Showing

**Problem**: Admin link doesn't appear in navigation

**Solutions**:
1. Verify the email in Firestore `admins` collection matches your login email exactly (case-sensitive)
2. Check browser console for errors
3. Refresh the page after logging in
4. Clear browser cache and try again

### Access Denied on Admin Page

**Problem**: Getting "Access Denied" message on admin page

**Solutions**:
1. Verify your email is in the `admins` collection
2. Check Firestore security rules are published
3. Ensure you're logged in with the correct email
4. Wait a few seconds for Firestore rules to propagate

### Firestore Permission Errors

**Problem**: Getting permission errors when accessing admin features

**Solutions**:
1. Verify Firestore security rules are correctly published
2. Check that the rules include the admin collection access
3. Ensure the admin email in Firestore matches the logged-in user's email exactly

---

## 📝 Notes

- Admin access is controlled via Firestore `admins` collection
- Email addresses must match exactly (case-sensitive)
- Only authenticated users with admin email in Firestore can access admin features
- Admin dashboard requires email verification (same as regular users)

---

## 🚀 Quick Setup Checklist

- [ ] Create `admins` collection in Firestore
- [ ] Add admin document with email as document ID
- [ ] Update Firestore security rules
- [ ] Publish security rules
- [ ] Test admin access by logging in
- [ ] Verify Admin link appears in navigation
- [ ] Test admin dashboard features

---

**Last Updated**: Profile & Admin Dashboard Implementation
**Status**: Ready for use
