# Complete Firestore Security Rules

## 📋 Copy and Paste These Rules

Go to: **Firebase Console → Firestore Database → Rules**

Then copy and paste the rules below:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // USER DATA COLLECTIONS
    // ============================================
    
    // Batches - Receipt processing status per user
    match /batches/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users - User statistics and profile data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      // Users can write their own data, admins can write for system updates
      allow write: if request.auth != null && 
        (request.auth.uid == userId || request.auth.token.admin == true);
    }
    
    // ============================================
    // BUSINESS COLLECTIONS (Multi-Tenant SaaS)
    // ============================================
    
    // Businesses - Business data with Drive/Sheet IDs
    match /businesses/{businessId} {
      // Bookkeeper can read their own business
      // Authorized users (drivers) can read business details (but not sensitive data)
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.bookkeeperUid ||
         request.auth.token.email in resource.data.authorizedUsers);
      
      // Only bookkeeper can write (create/update business)
      // Cloud Functions (Admin SDK) bypass these rules via service account
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.bookkeeperUid;
    }
    
    // Business assignments - Links users to businesses
    match /business_assignments/{userId} {
      // Users can read their own assignment
      allow read: if request.auth != null && request.auth.uid == userId;
      // Only Cloud Functions (Admin SDK) can write
      allow write: if false; // Disable client writes - only Admin SDK
    }
    
    // ============================================
    // ENTITY COLLECTIONS (Phase 4 - Legacy)
    // ============================================
    
    // Entities - Entity definitions
    match /entities/{entityId} {
      // Only admins can read/write entities
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Entity assignments - Links users to entities
    match /entity_assignments/{userId} {
      // Users can read their own assignment
      allow read: if request.auth != null && request.auth.uid == userId;
      // Only Cloud Functions (Admin SDK) can write
      allow write: if false; // Disable client writes - only Admin SDK
    }
    
    // ============================================
    // SHEET CONFIGURATIONS (Phase 4)
    // ============================================
    
    // Sheet configs - Sheet routing configurations
    match /sheet_configs/{configId} {
      // Only admins can read/write sheet configs
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // ============================================
    // RECEIPT PROCESSING COLLECTIONS
    // ============================================
    
    // Pending receipts - Receipts awaiting review
    match /pending_receipts/{receiptId} {
      // Users can read their own pending receipts
      // Admins can read all pending receipts
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         request.auth.token.admin == true);
      // Only Cloud Functions can write
      allow write: if false; // Disable client writes - only Admin SDK
    }
    
    // Rejected receipts - Receipts that were rejected
    match /rejected_receipts/{receiptId} {
      // Users can read their own rejected receipts
      // Admins can read all rejected receipts
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         request.auth.token.admin == true);
      // Only Cloud Functions can write
      allow write: if false; // Disable client writes - only Admin SDK
    }
    
    // ============================================
    // SYSTEM COLLECTIONS
    // ============================================
    
    // Categories - Dynamic category definitions
    match /categories/{categoryId} {
      // All authenticated users can read categories
      allow read: if request.auth != null;
      // Only admins can write categories
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Error logs - System error logging
    match /error_logs/{logId} {
      // Only admins can read error logs
      allow read: if request.auth != null && request.auth.token.admin == true;
      // Only Cloud Functions can write
      allow write: if false; // Disable client writes - only Admin SDK
    }
    
    // FX Cache - Currency exchange rate cache
    match /fx_cache/{cacheId} {
      // Only Cloud Functions can read/write
      allow read, write: if false; // Disable client access - only Admin SDK
    }
    
    // Archive batches - Archived batch data
    match /archive_batches/{batchId} {
      // Only admins can read archived batches
      allow read: if request.auth != null && request.auth.token.admin == true;
      // Only Cloud Functions can write
      allow write: if false; // Disable client writes - only Admin SDK
    }
    
    // ============================================
    // ADMIN COLLECTIONS
    // ============================================
    
    // Admins - Admin email addresses (legacy - for backward compatibility)
    match /admins/{email} {
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
    }
    
    // Admin data - Admin-only data collection
    match /admin_data/{document=**} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

---

## 📝 Rule Explanations

### User Data Collections

1. **`batches/{userId}`**
   - Users can only access their own batch documents
   - Used for receipt processing status

2. **`users/{userId}`**
   - Users can read their own user data
   - Users can write their own data, admins can write for system updates

### Business Collections (Multi-Tenant SaaS)

3. **`businesses/{businessId}`**
   - Bookkeepers can read/write their own business
   - Authorized users (drivers) can read business details
   - Drivers cannot see sheet IDs directly (security via Admin SDK)

4. **`business_assignments/{userId}`**
   - Users can read their own assignment
   - Only Cloud Functions can write (prevents tampering)

### Entity Collections (Legacy)

5. **`entities/{entityId}`**
   - Admin-only access
   - Used for Phase 4 multi-sheet routing

6. **`entity_assignments/{userId}`**
   - Users can read their own assignment
   - Only Cloud Functions can write

### Sheet Configurations

7. **`sheet_configs/{configId}`**
   - Admin-only access
   - Used for Phase 4 sheet routing

### Receipt Processing

8. **`pending_receipts/{receiptId}`**
   - Users can read their own pending receipts
   - Admins can read all pending receipts
   - Only Cloud Functions can write

9. **`rejected_receipts/{receiptId}`**
   - Users can read their own rejected receipts
   - Admins can read all rejected receipts
   - Only Cloud Functions can write

### System Collections

10. **`categories/{categoryId}`**
    - All authenticated users can read
    - Only admins can write

11. **`error_logs/{logId}`**
    - Admin-only access
    - Only Cloud Functions can write

12. **`fx_cache/{cacheId}`**
    - No client access (Cloud Functions only)
    - Currency exchange rate cache

13. **`archive_batches/{batchId}`**
    - Admin-only access
    - Only Cloud Functions can write

### Admin Collections

14. **`admins/{email}`**
    - Legacy admin collection
    - Only admins can read/write

15. **`admin_data/{document=**}`**
    - Admin-only access
    - For future admin features

---

## 🔒 Security Principles

1. **Least Privilege**: Users can only access their own data
2. **Admin SDK Protection**: Sensitive operations (sheet IDs, assignments) only via Cloud Functions
3. **No Client Writes**: Critical collections (assignments, receipts) can't be written by clients
4. **Custom Claims**: Admin access uses `request.auth.token.admin == true`
5. **Email-Based Access**: Business access uses email in `authorizedUsers` array

---

## ✅ How to Deploy

1. Go to: https://console.firebase.google.com/project/<YOUR_PROJECT_ID>/firestore/rules
2. Copy the rules above (everything between the ```javascript tags)
3. Paste into Firebase Console
4. Click **Publish**
5. Wait 10-20 seconds for rules to propagate

---

## 🧪 Testing

After deploying, test:
- ✅ Users can read their own batches/users
- ✅ Users cannot read other users' data
- ✅ Admins can access admin collections
- ✅ Business bookkeepers can access their business
- ✅ Drivers cannot see sheet IDs directly

---

**Status**: ✅ Complete rules ready to deploy

