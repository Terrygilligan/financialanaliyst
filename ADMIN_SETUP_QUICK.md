# Quick Admin Setup Guide

This guide explains how to set up admin access using **Firebase Custom Claims**, which is the recommended, most secure approach for role-based access control in this multi-tenant SaaS.

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

```bash
node setup-admin.js YOUR_EMAIL@EXAMPLE.COM
```

The script will:
- ✅ Find your user account by email
- ✅ Set the `admin: true` custom claim on your account
- ✅ Provide next steps for verification

---

## 🎯 Alternative Method: Using Cloud Function Call

If you have already deployed your Cloud Functions, you can call the `setAdminClaim` function directly via the Firebase CLI:

```bash
# Get your user's UID from Firebase Console → Authentication → Users
firebase functions:call setAdminClaim --data '{"uid":"YOUR_USER_UID_HERE"}'
```

---

## ✅ Verification Checklist

After running the setup:

1.  **Important**: You must **sign out and sign back in** for the custom claim to take effect.
2.  **Check Navigation**: You should now see an **Admin** link in the navigation menu.
3.  **Test Access**: Click the link or navigate directly to `/admin.html`. You should see the dashboard instead of "Access Denied".
4.  **Confirm Role**: In the Browser Console (F12), the application will log your admin status upon login.

---

## 🐛 Troubleshooting

### Admin Link Not Showing?

1.  **Sign out and sign back in**: This is mandatory because custom claims are embedded in the user's ID token, which is only refreshed on login.
2.  **Check Firebase Console**: Go to **Authentication** → **Users**, find your user, and verify that **Custom claims** shows `{"admin": true}`.
3.  **Force Token Refresh**: If it still doesn't show, try clearing your browser's site data or logging in from an Incognito window.

### "Access Denied" on Admin Page?

1.  Ensure you have published the latest Firestore security rules that check for custom claims (see `FIRESTORE_RULES_CUSTOM_CLAIMS.md`).
2.  Verify that your email address in the application matches exactly the one you provided to the setup script.

---

## 📚 Related Documentation

- `CUSTOM_CLAIMS_SETUP.md` - Detailed guide on custom claims implementation
- `FIRESTORE_RULES_CUSTOM_CLAIMS.md` - Updated security rules for custom claims
- `AGENTS.md` - The Multi-Tenant SaaS "Golden Rules"
