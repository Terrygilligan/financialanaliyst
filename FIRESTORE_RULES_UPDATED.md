# Updated Firestore Security Rules (Phase 4 Cleanup)

These rules implement the multi-tenant data isolation required by the project's security standards.

## 🔒 Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Multi-tenant user lookup
    match /user_lookup/{email} {
      allow get: if true;
      allow list, write: if false;
    }
    
    // Business Data Silos
    match /businesses/{businessId} {
      // Basic business access check
      allow read: if request.auth != null && request.auth.token.businessId == businessId;
      
      // Receipts Silo
      match /receipts/{receiptId} {
        allow read, write: if request.auth != null && request.auth.token.businessId == businessId;
      }

      // User Profiles & Stats Silo (Replaces top-level /users)
      match /users/{userId} {
        allow read: if request.auth != null && request.auth.token.businessId == businessId;
        allow write: if request.auth != null && 
          request.auth.token.businessId == businessId && 
          (request.auth.uid == userId || request.auth.token.admin == true);
      }

      // Activity & Audit Logs Silo
      match /activity/{activityId} {
        allow read: if request.auth != null && request.auth.token.businessId == businessId;
        allow write: if false; // System-only (Admin SDK)
      }
    }
    
    // System-wide admin access
    match /admin_data/{document=**} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

> ⚠️ **LEGACY WARNING**: Top-level collections like `/receipts`, `/batches`, and `/users` are now **DEPRECATED**. All data must be migrated to the `/businesses/{businessId}` silos.

---
**Last Updated**: December 31, 2025
