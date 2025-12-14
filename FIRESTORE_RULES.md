# Firestore Security Rules Setup

## Error: "Missing or insufficient permissions"

This error means Firestore security rules are blocking access. You need to configure the rules.

## Quick Fix: Update Firestore Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **financialanaliyst**
3. Click **Firestore Database** in the left menu
4. Click the **Rules** tab
5. Replace the existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own batch documents
    match /batches/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read/write their own user documents (if you create them)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. Click **Publish**

## For Testing (Temporary - Less Secure)

If you want to test quickly, you can use test mode temporarily:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // WARNING: This allows anyone to read/write - ONLY FOR TESTING!
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ IMPORTANT**: Replace with proper rules before going to production!

## What the Rules Do

### Production Rules (Recommended):
- Users can only access their own batch documents (`/batches/{userId}`)
- Users must be authenticated (`request.auth != null`)
- User ID in path must match authenticated user ID (`request.auth.uid == userId`)

### Test Rules (Temporary):
- Any authenticated user can read/write any document
- Use only for initial testing
- Must be replaced before production

## Verify Rules Are Active

After publishing:
1. Wait 10-20 seconds for rules to propagate
2. Refresh your app at `http://localhost:5000`
3. Try signing up/logging in again
4. The error should be resolved

## Common Issues

**Rules not updating:**
- Wait a bit longer (can take up to 1 minute)
- Clear browser cache
- Try in incognito mode

**Still getting errors:**
- Check that user is authenticated (`request.auth != null`)
- Verify the document path matches the rule pattern
- Check browser console for specific error details

---

**Status**: Rules need to be configured in Firebase Console
