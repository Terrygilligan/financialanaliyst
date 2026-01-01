# Complete Firestore Security Rules (Multi-Tenant SaaS)

These rules enforce the **Data Isolation (Silo Rule)** and **Identity Context** requirements defined in the project's "Golden Rules" (AGENTS.md).

## 🚀 How to Apply

1. Go to: **Firebase Console → Firestore Database → Rules**
2. Replace the existing rules with the content below.
3. Click **Publish**.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // IDENTITY & CONTEXT (Lookup Tables)
    // ============================================
    
    // User lookup table for account discovery (tenant-aware login)
    match /user_lookup/{email} {
      // Allow unauthenticated GET ONLY to find businessId before login
      allow get: if true; 
      allow list: if false; // Prevent email enumeration
      allow write: if false; // System-only (Admin SDK)
    }
    
    // Business assignments - System link table
    match /business_assignments/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // System-only (Admin SDK)
    }

    // ============================================
    // BUSINESS SILOS (The Golden Rule)
    // ============================================
    
    // All business data MUST be siloed under the businessId
    match /businesses/{businessId} {
      // Business metadata - only accessible by members of that business
      allow read: if request.auth != null && request.auth.token.businessId == businessId;
      // Only business admins or system admins can update business metadata
      allow write: if request.auth != null && 
        request.auth.token.businessId == businessId && 
        (request.auth.token.admin == true || request.auth.token.role == 'admin');
      
      // Receipts Silo
      match /receipts/{receiptId} {
        allow read, write: if request.auth != null && request.auth.token.businessId == businessId;
      }

      // Schema Definitions Silo
      match /schema_definitions/{schemaId} {
        allow read: if request.auth != null && request.auth.token.businessId == businessId;
        allow write: if request.auth != null && 
          request.auth.token.businessId == businessId && 
          (request.auth.token.role == 'admin' || request.auth.token.role == 'bookkeeper');
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

      // Archive Silo
      match /archive/{archiveId} {
        allow read: if request.auth != null && 
          request.auth.token.businessId == businessId && 
          (request.auth.token.admin == true || request.auth.token.role == 'admin');
        allow write: if false; // System-only (Admin SDK)
      }

      // Categories Silo
      match /categories/{categoryId} {
        allow read: if request.auth != null && request.auth.token.businessId == businessId;
        allow write: if request.auth != null && 
          request.auth.token.businessId == businessId && 
          (request.auth.token.admin == true || request.auth.token.role == 'admin');
      }
    }
    
    // ============================================
    // SYSTEM COLLECTIONS
    // ============================================
    
    // Global Admin Data - System-wide administration
    match /admin_data/{document=**} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }

    // FX Cache - System-wide currency cache (No client access)
    match /fx_cache/{cacheId} {
      allow read, write: if false;
    }
  }
}
```

## 📝 Rule Principles

1.  **Strict Isolation**: No user can read data from another `businessId`. The check `request.auth.token.businessId == businessId` is mandatory for all business-specific collections.
2.  **No Global Business Data**: Top-level collections like `receipts`, `batches`, or `users` (outside a silo) are deprecated and removed.
3.  **Lookup Table Protection**: `user_lookup` allows unauthenticated `get` to facilitate multi-tenant login discovery but prevents `list` to avoid email enumeration.
4.  **Custom Claims for Admin**: Global admin privileges are checked via `request.auth.token.admin == true`.
5.  **Tenant-Aware Roles**: Business-level roles (admin, bookkeeper, driver) are checked within the silo.

---

**Last Updated**: December 31, 2025
**Status**: ✅ Complete Multi-Tenant Rules
