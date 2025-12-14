# Firestore Setup Guide

## Error Message
```
Cloud Firestore API has not been used in project financialanaliyst before or it is disabled.
```

## Quick Fix

### Option 1: Direct Link (Easiest)
Click this link to enable Firestore API:
👉 **[Enable Firestore API](https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=financialanaliyst)**

Then click **"Enable"** button.

### Option 2: Manual Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: **financialanaliyst**
3. Navigate to **APIs & Services** → **Library**
4. Search for **"Cloud Firestore API"**
5. Click on it and click **"Enable"**

### Option 3: Via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **financialanaliyst**
3. Go to **Firestore Database**
4. Click **"Create database"** if you haven't created one yet
5. Choose **"Start in test mode"** (we'll update security rules later)
6. Select a location (choose one close to you, e.g., `us-central`)
7. Click **"Enable"**

## After Enabling

1. **Wait 1-2 minutes** for the API to propagate
2. **Refresh your browser** at `http://localhost:5000`
3. The error should be resolved

## Next Steps: Create Firestore Database

If you haven't created a Firestore database yet:

1. Go to [Firebase Console](https://console.firebase.google.com) → Your project
2. Click **Firestore Database** in the left menu
3. Click **"Create database"**
4. Choose **"Start in test mode"** (for now)
5. Select location: **us-central** (or closest to you)
6. Click **"Enable"**

## Security Rules (After Database is Created)

Once Firestore is enabled, update the security rules:

1. Go to **Firestore Database** → **Rules** tab
2. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /batches/{userId} {
      // Users can only read/write their own batch documents
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **"Publish"**

---

**Status**: Firestore API needs to be enabled
