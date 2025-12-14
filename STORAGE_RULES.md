# Firebase Storage Security Rules Setup

## Error: "User does not have permission to access"

This error means Firebase Storage security rules are blocking file uploads. You need to configure the rules.

## Quick Fix: Update Storage Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **financialanaliyst**
3. Click **Storage** in the left menu
4. Click the **Rules** tab
5. Replace the existing rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow users to upload and read their own receipt files
    match /receipts/{userId}/{fileName} {
      // Only authenticated users can upload
      allow write: if request.auth != null && request.auth.uid == userId;
      // Users can only read their own files
      allow read: if request.auth != null && request.auth.uid == userId;
    }
    
    // Deny all other paths
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

6. Click **Publish**

## What the Rules Do

- **Authenticated users only**: `request.auth != null` - User must be logged in
- **Own files only**: `request.auth.uid == userId` - User can only access files in their own folder
- **Path structure**: Files must be in `receipts/{userId}/{fileName}` format
- **Security**: All other paths are denied

## For Testing (Temporary - Less Secure)

If you want to test quickly, you can use more permissive rules temporarily:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // WARNING: This allows any authenticated user to upload anywhere - ONLY FOR TESTING!
    match /receipts/{userId}/{fileName} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ IMPORTANT**: Replace with proper rules before going to production!

## Verify Rules Are Active

After publishing:
1. Wait 10-20 seconds for rules to propagate
2. Refresh your app
3. Try uploading a receipt again
4. The error should be resolved

## Common Issues

**Rules not updating:**
- Wait a bit longer (can take up to 1 minute)
- Clear browser cache
- Try in incognito mode

**Still getting errors:**
- Check that user is authenticated (`request.auth != null`)
- Verify the file path matches the rule pattern (`receipts/{userId}/{fileName}`)
- Check browser console for specific error details
- Make sure the user's UID matches the folder name in the path

---

**Status**: Storage rules need to be configured in Firebase Console
