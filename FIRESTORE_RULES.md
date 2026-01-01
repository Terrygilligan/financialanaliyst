# Firestore Security Rules

These are the core security rules for the AI Financial Analyst platform.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Identity discovery
    match /user_lookup/{email} {
      allow get: if true;
      allow list, write: if false;
    }
    
    // Multi-tenant business silos
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
    
    // System Admin
    match /admin_data/{document=**} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```
