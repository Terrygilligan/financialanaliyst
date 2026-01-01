# Firestore Security Rules - Custom Claims & Multi-Tenancy

This version of the rules integrates **Firebase Custom Claims** with the required **Multi-Tenant Silo Architecture**.

## 🔒 Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 1. User Lookup (Discovery)
    match /user_lookup/{email} {
      allow get: if true; // Required for tenant discovery before login
      allow list, write: if false;
    }
    
    // 2. Business Silos (Data Isolation)
    match /businesses/{businessId} {
      // Basic business access check
      allow read: if request.auth != null && request.auth.token.businessId == businessId;
      
      // User Profile & Stats Silo (Replaces top-level /users)
      match /users/{userId} {
        allow read: if request.auth != null && request.auth.token.businessId == businessId;
        allow write: if request.auth != null && 
          request.auth.token.businessId == businessId && 
          (request.auth.uid == userId || request.auth.token.admin == true);
      }
      
      // Receipts & All other sub-collections...
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.token.businessId == businessId;
      }
    }
    
    // 3. Global Admin Access
    match /admin_data/{document=**} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

## 🔑 Key Features

- ✅ **Silo Isolation**: Users are strictly confined to their `businessId` via JWT custom claims.
- ✅ **Admin Claims**: System-wide admin access is granted via `token.admin == true`.
- ✅ **No Top-Level Business Data**: All financial and user data is nested under `/businesses/{businessId}/`.
- ✅ **Performance**: Using Custom Claims in the token avoids extra Firestore reads for permission checks.

---

**Last Updated**: December 31, 2025
**Status**: ✅ Multi-Tenant Integrated
