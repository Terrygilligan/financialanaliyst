# Automated Provisioning Architecture - Multi-Tenant SaaS

## 🎯 Overview

This document outlines the **automated provisioning system** that eliminates manual sheet sharing and creates a true multi-tenant SaaS experience.

---

## 🏗️ Architecture Comparison

### Current Architecture (Phase 4)
- Manual sheet creation via admin UI
- Manual folder sharing required
- Service account quota limitations
- Users must share folders manually

### New Architecture (Automated Provisioning)
- ✅ **Automatic** folder + sheet creation on business signup
- ✅ **Automatic** permission granting
- ✅ **Zero manual steps** for users
- ✅ Works with both Google Workspace (DWD) and personal accounts (OAuth)

---

## 📊 Data Structure

### 1. Businesses Collection
**Firestore**: `/businesses/{businessId}`

```typescript
interface Business {
  id: string;                    // Auto-generated business ID
  name: string;                  // Company name
  createdAt: string;             // ISO timestamp
  createdBy: string;             // Bookkeeper/admin UID
  
  // Google Drive Resources
  googleDrive: {
    folderId: string;            // Master folder ID in Drive
    folderUrl: string;           // Folder URL
    sheetId: string;             // Main Google Sheet ID
    sheetUrl: string;            // Sheet URL
  };
  
  // Access Control
  bookkeeperEmail: string;      // Primary bookkeeper email
  bookkeeperUid: string;        // Firebase Auth UID
  authorizedUsers: string[];     // Additional user emails with access
  
  // Configuration
  settings: {
    mainTabName?: string;        // Default: "Sheet1"
    accountantTabName?: string; // Default: "Accountant_CSV_Ready"
    currency?: string;           // Default: "GBP"
    timezone?: string;          // Default: "Europe/London"
  };
  
  // Status
  status: 'active' | 'suspended' | 'provisioning' | 'error';
  provisioningError?: string;   // Error message if provisioning failed
  
  // Statistics
  stats?: {
    totalReceipts: number;
    totalAmount: number;
    lastReceiptAt?: string;
  };
}
```

### 2. User-Business Relationship
**Firestore**: `/users/{userId}` (add fields)

```typescript
interface User {
  // Existing fields...
  email: string;
  displayName: string;
  
  // New fields for business association
  businessId?: string;          // Primary business ID
  role: 'bookkeeper' | 'driver' | 'admin'; // User role
  entityId?: string;             // Legacy: entity ID (for backward compatibility)
}
```

---

## 🔄 Provisioning Flow

### Step 1: Business Signup (One-Time)

When a bookkeeper signs up:

1. **Create Business Document**
   - Generate `businessId`
   - Store bookkeeper email/UID
   - Set status: `'provisioning'`

2. **Create Google Drive Folder**
   - Name: `{businessName} - Financial Records`
   - Location: Service account's accessible location OR user's Drive (via OAuth)
   - Store `folderId` in business document

3. **Create Google Sheet**
   - Name: `{businessName} - Receipts`
   - Location: Inside the folder
   - Pre-configure tabs (Main, Accountant_CSV_Ready)
   - Store `sheetId` in business document

4. **Grant Permissions**
   - Grant bookkeeper "Editor" access to folder
   - Grant service account "Editor" access (for appending data)
   - Store permissions in business document

5. **Update Status**
   - Set status: `'active'`
   - Log success

### Step 2: Receipt Processing (Every Upload)

When a driver uploads a receipt:

1. **Auth Check**: Verify driver's `uid`
2. **Business Lookup**: Find driver's `businessId` from `/users/{userId}`
3. **Sheet Retrieval**: Get `sheetId` from `/businesses/{businessId}`
4. **Gemini Processing**: Extract receipt data
5. **Append to Sheet**: Write to the business's sheet

---

## 🔐 Access Methods

### Method 1: Domain-Wide Delegation (Google Workspace) ⭐ Recommended

**For**: Businesses using Google Workspace (`@company.com`)

**Setup**:
1. Business admin authorizes your Service Account's Client ID in their Google Admin Console
2. Your app can impersonate any user in that domain
3. Create files "as" the bookkeeper (they own them)
4. No manual sharing needed

**Benefits**:
- ✅ Zero manual steps
- ✅ Files owned by bookkeeper
- ✅ Professional setup
- ✅ Unlimited storage (Shared Drives)

**Code**: Uses `google.auth.JWT` with `subject` parameter

### Method 2: OAuth 2.0 (Personal Accounts)

**For**: Personal Gmail accounts (`@gmail.com`)

**Setup**:
1. User signs in with Google
2. App requests Drive scope
3. Store OAuth token (encrypted)
4. Use token to create files in user's Drive

**Benefits**:
- ✅ Works with personal accounts
- ✅ Files in user's Drive
- ✅ Uses user's 15GB quota

**Limitations**:
- ⚠️ Token expires (need refresh)
- ⚠️ Requires re-auth if token invalid

**Code**: Uses `google.auth.OAuth2` with stored token

### Method 3: Service Account + Shared Folder (Fallback)

**For**: When DWD/OAuth not available

**Setup**:
1. Create folder in service account's accessible location
2. Share folder with bookkeeper
3. Create sheets in shared folder

**Limitations**:
- ⚠️ Requires manual sharing (one-time)
- ⚠️ Service account quota limitations

---

## 🚀 Implementation Plan

### Phase 1: Core Provisioning System
- [ ] Create `businesses` collection structure
- [ ] Implement `provisionBusiness` Cloud Function
- [ ] Add business signup UI
- [ ] Test with OAuth (personal accounts)

### Phase 2: Domain-Wide Delegation
- [ ] Add DWD support to provisioning
- [ ] Create admin UI for DWD authorization
- [ ] Document DWD setup process
- [ ] Test with Google Workspace

### Phase 3: Migration & Integration
- [ ] Migrate existing entities to businesses
- [ ] Update receipt processing to use businesses
- [ ] Update admin UI for business management
- [ ] Backward compatibility with Phase 4

### Phase 4: Advanced Features
- [ ] Multi-business support per user
- [ ] Business-level analytics
- [ ] Automated backups
- [ ] Business suspension/reactivation

---

## 📝 Code Structure

```
functions/src/
├── business-provisioning.ts    # Core provisioning logic
├── business-management.ts      # CRUD operations for businesses
├── domain-wide-delegation.ts   # DWD authentication
├── oauth-provisioning.ts       # OAuth-based provisioning
└── sheet-operations.ts         # Updated to support businesses
```

---

## 🔒 Security Considerations

1. **Firestore Rules**: Businesses collection should be admin-only
2. **Service Account**: Store keys securely (Secret Manager)
3. **OAuth Tokens**: Encrypt before storing in Firestore
4. **DWD Authorization**: One-time setup, secure storage
5. **Access Control**: Verify user has access to business before processing

---

## ✅ Success Criteria

- [ ] Bookkeeper signs up → Folder + Sheet created automatically
- [ ] Driver uploads receipt → Data goes to correct business sheet
- [ ] Zero manual sharing steps required
- [ ] Works with both Workspace and personal accounts
- [ ] Backward compatible with Phase 4 entities

---

**Status**: 🚧 In Progress  
**Priority**: High  
**Timeline**: 1-2 weeks

