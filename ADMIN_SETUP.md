# Admin Access Setup Guide (Modernized)

This guide explains how to set up admin access using **Firebase Custom Claims**, which is the required approach for role-based access control in this multi-tenant SaaS platform.

> ⚠️ **IMPORTANT**: The previous method using a top-level `/admins` Firestore collection is **DEPRECATED** and violates the "Golden Rules" (AGENTS.md). All admin access is now managed via secure Custom Claims.

---

## 🚀 Recommended Method: Using Node.js Script

This is the fastest and most reliable way to grant admin privileges.

### Prerequisites

1.  **Clone the repository** and navigate to the project root.
2.  **Install dependencies**:
    ```bash
    cd functions
    npm install
    cd ..
    ```
3.  **Authentication**: Ensure you are authenticated with Google Cloud:
    ```bash
    gcloud auth application-default login
    ```

### Run the Setup Script

The `setup-admin.js` script (located in the root) handles finding the user and setting the `admin: true` claim.

```bash
node setup-admin.js YOUR_EMAIL@EXAMPLE.COM
```

The script will:
- ✅ Find your user account by email (using the `user_lookup` collection)
- ✅ Set the `admin: true` custom claim on your account
- ✅ Provide next steps for verification

---

## 🎯 Alternative Method: Using Cloud Function Call

If you have already deployed your Cloud Functions, you can call the `setAdminClaim` function directly via the Firebase CLI:

```bash
# Get your user's UID from Firebase Console → Authentication → Users
# Note: In multi-tenant setup, ensure you're looking at the correct tenant
firebase functions:call setAdminClaim --data '{"uid":"YOUR_USER_UID_HERE"}'
```

---

## ✅ Verification Checklist

After running the setup:

1.  **Important**: You must **sign out and sign back in** for the custom claim to take effect. Custom claims are only updated in the user's ID token upon a fresh login or token refresh.
2.  **Check Navigation**: You should now see an **Admin** link in the navigation menu.
3.  **Test Access**: Click the link or navigate directly to `/admin.html`. You should see the dashboard instead of "Access Denied".

---

## 🔒 Security Architecture

The application enforces admin security in two ways:

1.  **Frontend**: UI elements (like the Admin link) are only visible if the ID token contains the `admin: true` claim.
2.  **Firestore Rules**: All admin-only collections (e.g., `/admin_data`) are protected by rules that check the token:
    ```javascript
    match /admin_data/{document=**} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
    ```

---

## 🔧 Troubleshooting

### Admin Link Not Showing?

1.  **Sign out and sign back in**: mandatory step.
2.  **Check Firebase Console**: Go to **Authentication** → **Users**, find your user, and verify that **Custom claims** shows `{"admin": true}`.
3.  **Check for Errors**: Look at the Browser Console (F12) for any permission errors when the app loads.

---

## 📚 Related Documentation

- `CUSTOM_CLAIMS_SETUP.md` - Technical details on the claims implementation
- `FIRESTORE_RULES_CUSTOM_CLAIMS.md` - The specific security rules used
- `AGENTS.md` - The project's "Golden Rules" on data isolation and deprecation

---

**Last Updated**: December 31, 2025
**Status**: ✅ Updated to Custom Claims
