# Multi-Tenancy Architecture Guide

## Overview
This document describes the multi-tenancy architecture implemented to transition the AI Financial Analyst app from a single-tenant prototype to a professional SaaS platform.

## 1. Identity Layer (Auth Custom Claims)
Every user is associated with a `businessId`. This ID is stored as a **Custom Claim** on the user's Firebase Authentication token.

- **Claim Name**: `businessId`
- **Purpose**: Acts as the primary "Silo Key" for all data access.
- **Enforcement**: Checked in Firestore and Storage Security Rules.

## 2. Data Layer (Firestore Silos)
Data is organized into silos based on the `businessId`.

- **Path**: `/businesses/{businessId}/receipts/{receiptId}`
- **Security**:
  ```javascript
  match /businesses/{businessId}/receipts/{receiptId} {
    allow read, write: if request.auth.token.businessId == businessId;
  }
  ```

## 3. Storage Layer (Path Isolation)
Receipt images are isolated by tenant and driver.

- **Path**: `/tenants/{businessId}/drivers/{driverId}/receipts/{fileName}`
- **Security**:
  ```javascript
  match /tenants/{businessId}/drivers/{driverId}/receipts/{fileName} {
    allow read, write: if request.auth.token.businessId == businessId && request.auth.uid == driverId;
  }
  ```

## 4. Compute Layer (Tenant-Aware Functions)
Cloud Functions extract the `businessId` from the storage path or the caller's auth context.

- **Extraction**: When a file is uploaded to `tenants/{businessId}/...`, the function parses the path to determine the tenant context.
- **Verification**: The function verifies the caller's claims before writing to the corresponding Firestore silo.

## 5. Migration Strategy
1. **Seeding**: Admins assign initial `businessId` claims using a secure script.
2. **Rules Deployment**: Security rules are updated to enforce isolation.
3. **Refactor**: Backend and frontend code are updated to use the new scoped paths.

