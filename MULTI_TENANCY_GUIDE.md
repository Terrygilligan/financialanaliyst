# Multi-Tenancy Architecture Guide

This document outlines the multi-tenant SaaS architecture implemented in this application. The new architecture is designed to isolate tenant data, enhance security, and provide a scalable foundation for future growth.

## 1. Architecture Overview

The migration moves the application from a single-tenant model with global collections to a **siloed multi-tenant architecture**. Each business (tenant) has its data stored in dedicated Firestore collections and Storage folders, ensuring that one tenant's data is not accessible to another.

The `businessId` custom claim, embedded in the user's Firebase Authentication token, is the cornerstone of this architecture. It is used in security rules to verify that a user can only access resources belonging to their own business.

## 2. Firestore Data Silo

All Firestore data is now organized under a top-level `businesses` collection, where each document represents a tenant.

-   **Structure**: `/businesses/{businessId}/receipts/{receiptId}`

-   **`businessId`**: The unique identifier for a tenant. This must match the `businessId` custom claim in the user's auth token.
-   **`receipts`**: A subcollection containing all receipts for that specific business.

This structure ensures that all database queries and writes are scoped to a single tenant, preventing data leakage.

## 3. Storage Isolation

Firebase Storage files are similarly isolated using a tenant-specific folder structure.

-   **Structure**: `/tenants/{businessId}/drivers/{driverId}/receipts/{fileName}`

-   **`tenants`**: The root folder for all tenant-specific data.
-   **`businessId`**: The tenant's unique identifier, matching the auth token claim.
-   **`driverId`**: The UID of the user (driver) who uploaded the receipt.
-   **`receipts`**: The folder containing the uploaded receipt images.

This folder-based isolation allows for granular security rules that control access to each tenant's files.

## 4. Security Rules

Security is enforced through `firestore.rules` and `storage.rules`, which are now implemented to validate every request against the user's `businessId` claim.

### `firestore.rules`

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all reads/writes by default
    match /{document=**} {
      allow read, write: if false;
    }

    // Allow access only if the user's businessId claim matches the path
    match /businesses/{businessId}/receipts/{receiptId} {
      allow read, write: if request.auth.token.businessId == businessId;
    }
  }
}
```

### `storage.rules`

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Deny all reads/writes by default
    match /{allPaths=**} {
      allow read, write: if false;
    }

    // Allow access only if businessId and driverId match the path and token
    match /tenants/{businessId}/drivers/{driverId}/receipts/{fileName} {
      allow read, write: if request.auth != null &&
                           request.auth.token.businessId == businessId &&
                           request.auth.uid == driverId;
    }
  }
}
```

## 5. Cloud Function (`analyzeReceiptUpload`)

The `analyzeReceiptUpload` Cloud Function has been refactored:

1.  **Path Parsing**: It now parses the new multi-tenant Storage path (`tenants/{businessId}/drivers/{driverId}/receipts/{fileName}`) to extract `businessId` and `driverId`.
2.  **Firestore Silo**: It writes the extracted receipt data to the correct Firestore silo at `/businesses/{businessId}/receipts/{receiptId}`.
3.  **Google Sheets Disabled**: The global Google Sheets integration has been disabled to align with the siloed architecture.

## 6. Frontend (`public/app.js`)

The frontend has been updated to support the new architecture:

1.  **Token Refresh**: A token refresh check is now in place to ensure the `businessId` custom claim is always present and up-to-date before a file upload is initiated.
2.  **Dynamic Upload Path**: The file upload logic constructs the new multi-tenant path (`tenants/{businessId}/drivers/{driverId}/receipts/{fileName}`) using the `businessId` from the user's token and their `uid` as the `driverId`.
3.  **Data Fetching**: The frontend now fetches and displays data (like upload history) from the correct Firestore silo.
