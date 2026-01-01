# Firebase Storage Security Rules Setup

## Error: "User does not have permission to access"

This error means Firebase Storage security rules are blocking file uploads. You need to configure the rules.

## Quick Fix: Update Storage Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **<YOUR_PROJECT_ID>**
3. Click **Storage** in the left menu
4. Click the **Rules** tab
5. Replace the existing rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Multi-Tenant Isolation: /tenants/{businessId}/drivers/{driverId}/receipts/
    match /tenants/{businessId}/drivers/{driverId}/receipts/{fileName} {
      // Users can only access their own tenant/driver silo
      allow read, write: if request.auth != null && 
        request.auth.token.businessId == businessId && 
        request.auth.uid == driverId;
    }
    
    // Admin Oversight
    match /tenants/{allPaths=**} {
      allow read: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

6. Click **Publish**

## What the Rules Do

- **Multi-Tenant Isolation**: Enforces that users can only access files within their own business tenant (`businessId`) and driver silo (`uid`).
- **JWT Context**: Uses custom claims in the authentication token to verify the user's `businessId`.
- **Authenticated users only**: `request.auth != null` - User must be logged in.
- **Siloed Path**: Files MUST be stored at `tenants/{businessId}/drivers/{uid}/receipts/{filename}`.
- **Admin Access**: Users with the `admin` custom claim can read all files for oversight purposes.

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
