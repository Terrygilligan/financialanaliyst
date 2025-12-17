# Phase 4: Admin Control Panel - Multi-Sheet & User Management

**Status**: 📝 Planned  
**Priority**: High  
**Timeline**: 2-3 weeks  
**Branch**: `feature/phase-4-multi-sheet-management`

---

## 📋 Overview

This phase adds enterprise-grade multi-sheet management capabilities, allowing admins to:
1. **Assign different Google Sheets** to different users or entities
2. **Manage sheet configurations** through an admin control panel
3. **Configure sheet output** per user/entity (which tabs to use, field mappings, etc.)
4. **Track sheet usage** and statistics
5. **Bulk user management** (assign sheets, entities, roles)

---

## 🎯 Goals

### Primary Goals
- ✅ Enable multiple Google Sheets per deployment (one per entity or user)
- ✅ Admin UI to manage sheet assignments
- ✅ Automatic routing of receipts to correct sheets
- ✅ Flexible sheet configuration (tab names, field mappings)
- ✅ Backward compatible with existing single-sheet setup

### Secondary Goals
- ✅ Sheet templates for quick setup
- ✅ Bulk user operations
- ✅ Sheet health monitoring
- ✅ Usage analytics per sheet

---

## 🏗️ Architecture

### Data Structure

#### 1. Sheet Configurations Collection
**Firestore**: `/sheet_configs/{configId}`

```typescript
interface SheetConfig {
  id: string;                      // Auto-generated or custom ID
  name: string;                    // Display name (e.g., "Entity A Sheet")
  sheetId: string;                 // Google Sheet ID
  isDefault: boolean;              // Default sheet for unassigned users
  createdAt: string;               // ISO timestamp
  createdBy: string;               // Admin UID
  lastModified: string;            // ISO timestamp
  
  // Sheet configuration
  config: {
    mainTabName?: string;          // Default: "Sheet1"
    accountantTabName?: string;    // Default: "Accountant_CSV_Ready"
    createTabsIfMissing?: boolean; // Auto-create tabs
    headerRow?: number;            // Default: 1
    
    // Field mappings (future enhancement)
    fieldMapping?: {
      vendorName: string;          // Column name
      date: string;
      totalAmount: string;
      category: string;
      // ... etc
    };
  };
  
  // Access control
  assignedTo: {
    type: 'entity' | 'user' | 'all'; // Assignment type
    entityIds?: string[];            // Entity IDs (if type = 'entity')
    userIds?: string[];              // User IDs (if type = 'user')
  };
  
  // Status & health
  status: 'active' | 'inactive' | 'error';
  lastHealthCheck?: string;        // Last verification timestamp
  healthStatus?: {
    accessible: boolean;
    hasPermissions: boolean;
    tabsExist: boolean;
    errorMessage?: string;
  };
  
  // Statistics
  stats?: {
    totalReceipts: number;
    lastReceiptAt?: string;
  };
}
```

#### 2. User Sheet Assignments
**Firestore**: `/users/{userId}` (add fields)

```typescript
interface UserDocument {
  // ... existing fields ...
  sheetConfigId?: string;          // Override sheet config
  useEntitySheet?: boolean;        // Use entity's sheet (default: true)
}
```

#### 3. Entity Sheet Assignments
**Firestore**: `/entities/{entityId}` (add fields)

```typescript
interface EntityDocument {
  // ... existing fields ...
  sheetConfigId?: string;          // Sheet config for this entity
}
```

---

## 🔧 Implementation Plan

### Step 1: Backend - Sheet Configuration Service
**File**: `functions/src/sheet-config.ts`

```typescript
// functions/src/sheet-config.ts

import { getFirestore } from "firebase-admin/firestore";
import { sheets_v4 } from 'googleapis';

const db = getFirestore();

export interface SheetConfig {
  id: string;
  name: string;
  sheetId: string;
  isDefault: boolean;
  createdAt: string;
  createdBy: string;
  lastModified: string;
  config: {
    mainTabName?: string;
    accountantTabName?: string;
    createTabsIfMissing?: boolean;
    headerRow?: number;
  };
  assignedTo: {
    type: 'entity' | 'user' | 'all';
    entityIds?: string[];
    userIds?: string[];
  };
  status: 'active' | 'inactive' | 'error';
  lastHealthCheck?: string;
  healthStatus?: {
    accessible: boolean;
    hasPermissions: boolean;
    tabsExist: boolean;
    errorMessage?: string;
  };
  stats?: {
    totalReceipts: number;
    lastReceiptAt?: string;
  };
}

/**
 * Lookup the correct sheet config for a user
 */
export async function getSheetConfigForUser(userId: string): Promise<SheetConfig | null> {
  try {
    // 1. Check if user has a direct sheet assignment
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.sheetConfigId) {
      const configDoc = await db.collection('sheet_configs').doc(userDoc.data()!.sheetConfigId).get();
      if (configDoc.exists) {
        return { id: configDoc.id, ...configDoc.data() } as SheetConfig;
      }
    }
    
    // 2. Check if user's entity has a sheet assignment
    if (userDoc.exists && userDoc.data()?.entity) {
      const entityId = userDoc.data()!.entity;
      const entityDoc = await db.collection('entities').doc(entityId).get();
      if (entityDoc.exists && entityDoc.data()?.sheetConfigId) {
        const configDoc = await db.collection('sheet_configs').doc(entityDoc.data()!.sheetConfigId).get();
        if (configDoc.exists) {
          return { id: configDoc.id, ...configDoc.data() } as SheetConfig;
        }
      }
    }
    
    // 3. Fall back to default sheet config
    const defaultConfigQuery = await db.collection('sheet_configs')
      .where('isDefault', '==', true)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (!defaultConfigQuery.empty) {
      const defaultConfig = defaultConfigQuery.docs[0];
      return { id: defaultConfig.id, ...defaultConfig.data() } as SheetConfig;
    }
    
    // 4. No config found - use legacy environment variable
    return null; // Caller should use GOOGLE_SHEET_ID from env
  } catch (error) {
    console.error(`Error getting sheet config for user ${userId}:`, error);
    return null;
  }
}

/**
 * Get all active sheet configurations
 */
export async function getAllSheetConfigs(): Promise<SheetConfig[]> {
  const snapshot = await db.collection('sheet_configs')
    .where('status', '==', 'active')
    .orderBy('name')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as SheetConfig));
}

/**
 * Create a new sheet configuration
 */
export async function createSheetConfig(
  config: Omit<SheetConfig, 'id' | 'createdAt' | 'lastModified'>,
  creatorUid: string
): Promise<string> {
  const newConfig = {
    ...config,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    createdBy: creatorUid
  };
  
  const docRef = await db.collection('sheet_configs').add(newConfig);
  return docRef.id;
}

/**
 * Update sheet configuration
 */
export async function updateSheetConfig(
  configId: string,
  updates: Partial<SheetConfig>
): Promise<void> {
  await db.collection('sheet_configs').doc(configId).update({
    ...updates,
    lastModified: new Date().toISOString()
  });
}

/**
 * Delete sheet configuration
 */
export async function deleteSheetConfig(configId: string): Promise<void> {
  await db.collection('sheet_configs').doc(configId).update({
    status: 'inactive',
    lastModified: new Date().toISOString()
  });
}

/**
 * Verify sheet health (accessibility, permissions, tabs)
 */
export async function verifySheetHealth(
  sheetId: string,
  sheetsClient: sheets_v4.Sheets
): Promise<SheetConfig['healthStatus']> {
  try {
    // Try to get sheet metadata
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'sheets.properties.title'
    });
    
    const sheets = response.data.sheets || [];
    const sheetTitles = sheets.map(s => s.properties?.title || '');
    
    return {
      accessible: true,
      hasPermissions: true,
      tabsExist: sheetTitles.length > 0,
      errorMessage: undefined
    };
  } catch (error: any) {
    return {
      accessible: false,
      hasPermissions: false,
      tabsExist: false,
      errorMessage: error.message
    };
  }
}

/**
 * Assign sheet config to user
 */
export async function assignSheetToUser(
  userId: string,
  sheetConfigId: string
): Promise<void> {
  await db.collection('users').doc(userId).set({
    sheetConfigId: sheetConfigId,
    lastModified: new Date().toISOString()
  }, { merge: true });
}

/**
 * Assign sheet config to entity
 */
export async function assignSheetToEntity(
  entityId: string,
  sheetConfigId: string
): Promise<void> {
  await db.collection('entities').doc(entityId).update({
    sheetConfigId: sheetConfigId,
    lastModified: new Date().toISOString()
  });
}

/**
 * Get users assigned to a sheet config
 */
export async function getUsersForSheetConfig(configId: string): Promise<any[]> {
  const usersSnapshot = await db.collection('users')
    .where('sheetConfigId', '==', configId)
    .get();
  
  return usersSnapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  }));
}

/**
 * Get entities assigned to a sheet config
 */
export async function getEntitiesForSheetConfig(configId: string): Promise<any[]> {
  const entitiesSnapshot = await db.collection('entities')
    .where('sheetConfigId', '==', configId)
    .get();
  
  return entitiesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
```

---

### Step 2: Update Sheets Service
**File**: `functions/src/sheets.ts`

Add multi-sheet support to the existing sheets service:

```typescript
// functions/src/sheets.ts

import { getSheetConfigForUser, SheetConfig } from './sheet-config';

// ... existing code ...

/**
 * Append receipt to the correct sheet for a user
 */
export async function appendReceiptToUserSheet(
  receiptData: ReceiptData,
  userId: string
): Promise<{ success: boolean; sheetId: string; sheetLink: string }> {
  try {
    // 1. Get the correct sheet config for this user
    const sheetConfig = await getSheetConfigForUser(userId);
    
    // 2. Determine sheet ID (fall back to env variable if no config)
    const sheetId = sheetConfig?.sheetId || process.env.GOOGLE_SHEET_ID;
    
    if (!sheetId) {
      throw new Error('No sheet ID found for user');
    }
    
    // 3. Get tab names from config (or use defaults)
    const mainTabName = sheetConfig?.config?.mainTabName || 'Sheet1';
    const accountantTabName = sheetConfig?.config?.accountantTabName || 'Accountant_CSV_Ready';
    
    // 4. Write to main sheet
    await appendReceiptToSheet(receiptData, sheetId, mainTabName);
    
    // 5. Write to accountant sheet (non-blocking)
    try {
      await appendToAccountantSheet(receiptData, sheetId, accountantTabName);
    } catch (error) {
      console.warn('Failed to write to accountant sheet (non-critical):', error);
    }
    
    // 6. Update sheet statistics
    if (sheetConfig) {
      await updateSheetStats(sheetConfig.id, receiptData);
    }
    
    return {
      success: true,
      sheetId: sheetId,
      sheetLink: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
    };
  } catch (error) {
    console.error('Error appending receipt to user sheet:', error);
    throw error;
  }
}

/**
 * Update sheet statistics after successful write
 */
async function updateSheetStats(configId: string, receiptData: ReceiptData): Promise<void> {
  try {
    const db = getFirestore();
    const configRef = db.collection('sheet_configs').doc(configId);
    
    await db.runTransaction(async (transaction) => {
      const configDoc = await transaction.get(configRef);
      if (configDoc.exists) {
        const currentStats = configDoc.data()?.stats || { totalReceipts: 0 };
        transaction.update(configRef, {
          'stats.totalReceipts': (currentStats.totalReceipts || 0) + 1,
          'stats.lastReceiptAt': new Date().toISOString()
        });
      }
    });
  } catch (error) {
    console.error('Error updating sheet stats:', error);
    // Non-critical, don't throw
  }
}

/**
 * Update existing appendReceiptToSheet to accept optional tab name
 */
export async function appendReceiptToSheet(
    receiptData: ReceiptData,
    sheetId: string,
    tabName: string = 'Sheet1' // Add tab name parameter with default
): Promise<void> {
  // ... existing implementation, use tabName instead of hardcoded 'Sheet1' ...
}

/**
 * Update existing appendToAccountantSheet to accept optional tab name
 */
export async function appendToAccountantSheet(
    receiptData: ReceiptData,
    sheetId: string,
    tabName: string = 'Accountant_CSV_Ready' // Add tab name parameter with default
): Promise<void> {
  // ... existing implementation, use tabName instead of hardcoded 'Accountant_CSV_Ready' ...
}
```

---

### Step 3: Update Cloud Functions
**Files**: `functions/src/index.ts`, `functions/src/finalize.ts`, `functions/src/admin-review.ts`

Replace direct sheet writes with the new `appendReceiptToUserSheet` function:

```typescript
// functions/src/index.ts (analyzeReceiptUpload - direct processing path)

// OLD:
// await appendReceiptToSheet(receiptData, sheetId);

// NEW:
const sheetResult = await appendReceiptToUserSheet(receiptData, userId);
console.log(`Receipt written to sheet ${sheetResult.sheetId}`);

// functions/src/finalize.ts (finalizeReceipt)
// Same change

// functions/src/admin-review.ts (approveReceipt)
// Same change
```

---

### Step 4: Admin Cloud Functions
**File**: `functions/src/admin-sheet-management.ts`

Create Cloud Functions for admin sheet management:

```typescript
// functions/src/admin-sheet-management.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { 
  createSheetConfig, 
  updateSheetConfig, 
  deleteSheetConfig,
  getAllSheetConfigs,
  verifySheetHealth,
  assignSheetToUser,
  assignSheetToEntity,
  getUsersForSheetConfig,
  getEntitiesForSheetConfig,
  SheetConfig
} from "./sheet-config";
import { getSheetsClient } from "./sheets";

/**
 * Verify user is admin (helper)
 */
function verifyAdmin(request: any): string {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  if (!request.auth.token.admin) {
    throw new HttpsError('permission-denied', 'User must be an admin');
  }
  
  return request.auth.uid;
}

/**
 * Create a new sheet configuration
 */
export const createSheetConfiguration = onCall(
  { region: "us-central1" },
  async (request) => {
    const adminUid = verifyAdmin(request);
    
    const { name, sheetId, config, assignedTo } = request.data;
    
    if (!name || !sheetId) {
      throw new HttpsError('invalid-argument', 'Name and sheetId are required');
    }
    
    const newConfig: Omit<SheetConfig, 'id' | 'createdAt' | 'lastModified'> = {
      name,
      sheetId,
      isDefault: false,
      createdBy: adminUid,
      config: config || {},
      assignedTo: assignedTo || { type: 'all' },
      status: 'active'
    };
    
    const configId = await createSheetConfig(newConfig, adminUid);
    
    return { 
      success: true, 
      configId,
      message: 'Sheet configuration created successfully' 
    };
  }
);

/**
 * Update sheet configuration
 */
export const updateSheetConfiguration = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { configId, updates } = request.data;
    
    if (!configId) {
      throw new HttpsError('invalid-argument', 'configId is required');
    }
    
    await updateSheetConfig(configId, updates);
    
    return { 
      success: true, 
      message: 'Sheet configuration updated successfully' 
    };
  }
);

/**
 * Delete (deactivate) sheet configuration
 */
export const deleteSheetConfiguration = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { configId } = request.data;
    
    if (!configId) {
      throw new HttpsError('invalid-argument', 'configId is required');
    }
    
    await deleteSheetConfig(configId);
    
    return { 
      success: true, 
      message: 'Sheet configuration deleted successfully' 
    };
  }
);

/**
 * Get all sheet configurations
 */
export const getSheetConfigurations = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const configs = await getAllSheetConfigs();
    
    return { 
      success: true, 
      configs 
    };
  }
);

/**
 * Verify sheet health
 */
export const checkSheetHealth = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { sheetId } = request.data;
    
    if (!sheetId) {
      throw new HttpsError('invalid-argument', 'sheetId is required');
    }
    
    const sheetsClient = getSheetsClient();
    const healthStatus = await verifySheetHealth(sheetId, sheetsClient);
    
    return { 
      success: true, 
      healthStatus 
    };
  }
);

/**
 * Assign sheet to user
 */
export const assignSheetConfigToUser = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { userId, sheetConfigId } = request.data;
    
    if (!userId || !sheetConfigId) {
      throw new HttpsError('invalid-argument', 'userId and sheetConfigId are required');
    }
    
    await assignSheetToUser(userId, sheetConfigId);
    
    return { 
      success: true, 
      message: 'Sheet assigned to user successfully' 
    };
  }
);

/**
 * Assign sheet to entity
 */
export const assignSheetConfigToEntity = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { entityId, sheetConfigId } = request.data;
    
    if (!entityId || !sheetConfigId) {
      throw new HttpsError('invalid-argument', 'entityId and sheetConfigId are required');
    }
    
    await assignSheetToEntity(entityId, sheetConfigId);
    
    return { 
      success: true, 
      message: 'Sheet assigned to entity successfully' 
    };
  }
);

/**
 * Get users and entities for a sheet config
 */
export const getSheetConfigAssignments = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { configId } = request.data;
    
    if (!configId) {
      throw new HttpsError('invalid-argument', 'configId is required');
    }
    
    const users = await getUsersForSheetConfig(configId);
    const entities = await getEntitiesForSheetConfig(configId);
    
    return { 
      success: true, 
      users,
      entities
    };
  }
);

/**
 * Bulk assign users to sheet config
 */
export const bulkAssignUsersToSheet = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { userIds, sheetConfigId } = request.data;
    
    if (!userIds || !Array.isArray(userIds) || !sheetConfigId) {
      throw new HttpsError('invalid-argument', 'userIds (array) and sheetConfigId are required');
    }
    
    const results = await Promise.allSettled(
      userIds.map(userId => assignSheetToUser(userId, sheetConfigId))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return { 
      success: true, 
      message: `Assigned ${successful} users successfully, ${failed} failed`,
      successful,
      failed
    };
  }
);
```

Export these functions in `functions/src/index.ts`:

```typescript
// functions/src/index.ts

// ... existing imports ...

// Phase 4: Multi-Sheet Management
export { 
  createSheetConfiguration,
  updateSheetConfiguration,
  deleteSheetConfiguration,
  getSheetConfigurations,
  checkSheetHealth,
  assignSheetConfigToUser,
  assignSheetConfigToEntity,
  getSheetConfigAssignments,
  bulkAssignUsersToSheet
} from './admin-sheet-management';
```

---

### Step 5: Admin UI - Sheet Management Panel
**File**: `public/admin-sheets.html`

Create new admin page for sheet management:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sheet Management - Admin</title>
    <link rel="stylesheet" href="styles.css?v=20251217">
</head>
<body>
    <div class="container">
        <header>
            <h1>🗂️ Sheet Management</h1>
            <nav class="auth-section">
                <a href="index.html">Home</a>
                <a href="profile.html">Profile</a>
                <a href="admin.html">Admin Dashboard</a>
                <a href="admin-sheets.html" class="active">Sheet Management</a>
                <button id="logout-btn">Logout</button>
            </nav>
        </header>

        <!-- Sheet Configurations List -->
        <section class="card">
            <div class="section-header">
                <h2>Sheet Configurations</h2>
                <button id="create-sheet-btn" class="btn-primary">+ Create New Sheet Config</button>
            </div>
            
            <div id="sheets-list" class="sheets-list">
                <!-- Populated by JavaScript -->
            </div>
        </section>

        <!-- Create/Edit Sheet Config Modal -->
        <div id="sheet-config-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <h2 id="modal-title">Create Sheet Configuration</h2>
                
                <form id="sheet-config-form">
                    <div class="form-group">
                        <label for="config-name">Name *</label>
                        <input type="text" id="config-name" required placeholder="e.g., Entity A Sheet">
                    </div>
                    
                    <div class="form-group">
                        <label for="config-sheet-id">Google Sheet ID *</label>
                        <input type="text" id="config-sheet-id" required placeholder="1gc-R5cKCOVFnnC0EsVJ...">
                        <small>The ID from the Google Sheets URL</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="config-main-tab">Main Tab Name</label>
                        <input type="text" id="config-main-tab" placeholder="Sheet1 (default)">
                    </div>
                    
                    <div class="form-group">
                        <label for="config-accountant-tab">Accountant Tab Name</label>
                        <input type="text" id="config-accountant-tab" placeholder="Accountant_CSV_Ready (default)">
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="config-default">
                            Set as default sheet
                        </label>
                        <small>New users without assignments will use this sheet</small>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" id="cancel-btn" class="btn-secondary">Cancel</button>
                        <button type="button" id="verify-sheet-btn" class="btn-secondary">Verify Sheet</button>
                        <button type="submit" class="btn-primary">Save Configuration</button>
                    </div>
                </form>
                
                <div id="verification-result" class="verification-result" style="display: none;"></div>
            </div>
        </div>

        <!-- Sheet Assignment Modal -->
        <div id="sheet-assignment-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <h2>Assign Sheet: <span id="assign-sheet-name"></span></h2>
                
                <div class="tabs">
                    <button class="tab-btn active" data-tab="assign-users">Assign to Users</button>
                    <button class="tab-btn" data-tab="assign-entities">Assign to Entities</button>
                    <button class="tab-btn" data-tab="view-assignments">View Current Assignments</button>
                </div>
                
                <!-- Assign to Users Tab -->
                <div id="assign-users" class="tab-content active">
                    <div class="form-group">
                        <label for="user-select">Select Users</label>
                        <select id="user-select" multiple size="10">
                            <!-- Populated by JavaScript -->
                        </select>
                        <small>Hold Ctrl/Cmd to select multiple users</small>
                    </div>
                    <button id="assign-users-btn" class="btn-primary">Assign Selected Users</button>
                </div>
                
                <!-- Assign to Entities Tab -->
                <div id="assign-entities" class="tab-content" style="display: none;">
                    <div class="form-group">
                        <label for="entity-select">Select Entity</label>
                        <select id="entity-select">
                            <!-- Populated by JavaScript -->
                        </select>
                    </div>
                    <button id="assign-entity-btn" class="btn-primary">Assign Entity</button>
                </div>
                
                <!-- View Assignments Tab -->
                <div id="view-assignments" class="tab-content" style="display: none;">
                    <h3>Users Assigned:</h3>
                    <div id="assigned-users-list">Loading...</div>
                    
                    <h3>Entities Assigned:</h3>
                    <div id="assigned-entities-list">Loading...</div>
                </div>
                
                <div class="form-actions">
                    <button id="close-assignment-modal-btn" class="btn-secondary">Close</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Firebase SDKs -->
    <script type="module">
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
        import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
        import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';
        import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
        
        import firebaseConfig from './firebase-config.js';
        
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const functions = getFunctions(app, 'us-central1');
        const db = getFirestore(app);
        
        window.auth = auth;
        window.functions = functions;
        window.db = db;
    </script>
    <script src="admin-sheets.js?v=20251217"></script>
</body>
</html>
```

---

### Step 6: Admin UI JavaScript
**File**: `public/admin-sheets.js`

```javascript
// public/admin-sheets.js

let currentConfigId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication and admin status
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        const isAdmin = await checkAdminStatus(user);
        if (!isAdmin) {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return;
        }
        
        // Load sheet configurations
        await loadSheetConfigs();
    });
    
    // Event listeners
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('create-sheet-btn').addEventListener('click', showCreateModal);
    document.getElementById('cancel-btn').addEventListener('click', hideModal);
    document.getElementById('verify-sheet-btn').addEventListener('click', verifySheet);
    document.getElementById('sheet-config-form').addEventListener('submit', saveSheetConfig);
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
});

async function checkAdminStatus(user) {
    try {
        const idTokenResult = await user.getIdTokenResult(true);
        return idTokenResult.claims.admin === true;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

async function loadSheetConfigs() {
    const getSheetConfigurations = httpsCallable(functions, 'getSheetConfigurations');
    
    try {
        const result = await getSheetConfigurations();
        const configs = result.data.configs;
        
        displaySheetConfigs(configs);
    } catch (error) {
        console.error('Error loading sheet configs:', error);
        alert('Failed to load sheet configurations: ' + error.message);
    }
}

function displaySheetConfigs(configs) {
    const listContainer = document.getElementById('sheets-list');
    
    if (configs.length === 0) {
        listContainer.innerHTML = '<p>No sheet configurations found. Create your first one!</p>';
        return;
    }
    
    listContainer.innerHTML = configs.map(config => `
        <div class="sheet-config-card">
            <div class="sheet-config-header">
                <h3>${config.name}</h3>
                ${config.isDefault ? '<span class="badge-default">Default</span>' : ''}
                <span class="badge-status badge-${config.status}">${config.status}</span>
            </div>
            <div class="sheet-config-body">
                <p><strong>Sheet ID:</strong> <code>${config.sheetId}</code></p>
                <p><strong>Main Tab:</strong> ${config.config?.mainTabName || 'Sheet1'}</p>
                <p><strong>Accountant Tab:</strong> ${config.config?.accountantTabName || 'Accountant_CSV_Ready'}</p>
                <p><strong>Total Receipts:</strong> ${config.stats?.totalReceipts || 0}</p>
                ${config.stats?.lastReceiptAt ? `<p><strong>Last Receipt:</strong> ${new Date(config.stats.lastReceiptAt).toLocaleString()}</p>` : ''}
            </div>
            <div class="sheet-config-actions">
                <button onclick="editConfig('${config.id}')" class="btn-secondary">Edit</button>
                <button onclick="showAssignmentModal('${config.id}', '${config.name}')" class="btn-secondary">Assign Users/Entities</button>
                <button onclick="checkHealth('${config.id}', '${config.sheetId}')" class="btn-secondary">Check Health</button>
                <button onclick="deleteConfig('${config.id}')" class="btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
}

function showCreateModal() {
    currentConfigId = null;
    document.getElementById('modal-title').textContent = 'Create Sheet Configuration';
    document.getElementById('sheet-config-form').reset();
    document.getElementById('sheet-config-modal').style.display = 'flex';
}

function hideModal() {
    document.getElementById('sheet-config-modal').style.display = 'none';
    document.getElementById('sheet-assignment-modal').style.display = 'none';
}

async function verifySheet() {
    const sheetId = document.getElementById('config-sheet-id').value;
    
    if (!sheetId) {
        alert('Please enter a Sheet ID first');
        return;
    }
    
    const checkSheetHealth = httpsCallable(functions, 'checkSheetHealth');
    const resultDiv = document.getElementById('verification-result');
    
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<p>Verifying sheet...</p>';
    
    try {
        const result = await checkSheetHealth({ sheetId });
        const health = result.data.healthStatus;
        
        if (health.accessible && health.tabsExist) {
            resultDiv.className = 'verification-result success';
            resultDiv.innerHTML = `
                <p>✅ Sheet is accessible and configured correctly!</p>
                <p>✅ Service account has proper permissions</p>
                <p>✅ Sheet tabs found</p>
            `;
        } else {
            resultDiv.className = 'verification-result error';
            resultDiv.innerHTML = `
                <p>❌ Sheet verification failed</p>
                <p>Error: ${health.errorMessage || 'Unknown error'}</p>
                <p>Make sure the sheet is shared with: financial-output@financialanaliyst.iam.gserviceaccount.com</p>
            `;
        }
    } catch (error) {
        resultDiv.className = 'verification-result error';
        resultDiv.innerHTML = `<p>❌ Verification error: ${error.message}</p>`;
    }
}

async function saveSheetConfig(e) {
    e.preventDefault();
    
    const name = document.getElementById('config-name').value;
    const sheetId = document.getElementById('config-sheet-id').value;
    const mainTab = document.getElementById('config-main-tab').value;
    const accountantTab = document.getElementById('config-accountant-tab').value;
    const isDefault = document.getElementById('config-default').checked;
    
    const configData = {
        name,
        sheetId,
        isDefault,
        config: {
            mainTabName: mainTab || 'Sheet1',
            accountantTabName: accountantTab || 'Accountant_CSV_Ready',
            createTabsIfMissing: true,
            headerRow: 1
        },
        assignedTo: { type: 'all' },
        status: 'active'
    };
    
    try {
        if (currentConfigId) {
            // Update existing
            const updateSheetConfiguration = httpsCallable(functions, 'updateSheetConfiguration');
            await updateSheetConfiguration({ configId: currentConfigId, updates: configData });
            alert('Sheet configuration updated successfully!');
        } else {
            // Create new
            const createSheetConfiguration = httpsCallable(functions, 'createSheetConfiguration');
            await createSheetConfiguration(configData);
            alert('Sheet configuration created successfully!');
        }
        
        hideModal();
        await loadSheetConfigs();
    } catch (error) {
        console.error('Error saving sheet config:', error);
        alert('Failed to save configuration: ' + error.message);
    }
}

async function editConfig(configId) {
    // TODO: Load config data and populate form
    currentConfigId = configId;
    document.getElementById('modal-title').textContent = 'Edit Sheet Configuration';
    document.getElementById('sheet-config-modal').style.display = 'flex';
    // Load config data and populate form fields...
}

async function deleteConfig(configId) {
    if (!confirm('Are you sure you want to delete this sheet configuration?')) {
        return;
    }
    
    const deleteSheetConfiguration = httpsCallable(functions, 'deleteSheetConfiguration');
    
    try {
        await deleteSheetConfiguration({ configId });
        alert('Sheet configuration deleted successfully!');
        await loadSheetConfigs();
    } catch (error) {
        console.error('Error deleting config:', error);
        alert('Failed to delete configuration: ' + error.message);
    }
}

async function checkHealth(configId, sheetId) {
    const checkSheetHealth = httpsCallable(functions, 'checkSheetHealth');
    
    try {
        const result = await checkSheetHealth({ sheetId });
        const health = result.data.healthStatus;
        
        if (health.accessible) {
            alert('✅ Sheet is healthy and accessible!');
        } else {
            alert(`❌ Sheet health check failed:\n${health.errorMessage}`);
        }
    } catch (error) {
        alert('❌ Health check error: ' + error.message);
    }
}

async function showAssignmentModal(configId, configName) {
    currentConfigId = configId;
    document.getElementById('assign-sheet-name').textContent = configName;
    document.getElementById('sheet-assignment-modal').style.display = 'flex';
    
    // Load users and entities
    await loadUsersAndEntities();
    await loadCurrentAssignments(configId);
}

async function loadUsersAndEntities() {
    // Load all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const userSelect = document.getElementById('user-select');
    userSelect.innerHTML = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return `<option value="${doc.id}">${data.email || doc.id}</option>`;
    }).join('');
    
    // Load all entities
    const entitiesSnapshot = await getDocs(collection(db, 'entities'));
    const entitySelect = document.getElementById('entity-select');
    entitySelect.innerHTML = '<option value="">Select an entity...</option>' + 
        entitiesSnapshot.docs.map(doc => {
            const data = doc.data();
            return `<option value="${doc.id}">${data.name || doc.id}</option>`;
        }).join('');
}

async function loadCurrentAssignments(configId) {
    const getSheetConfigAssignments = httpsCallable(functions, 'getSheetConfigAssignments');
    
    try {
        const result = await getSheetConfigAssignments({ configId });
        const { users, entities } = result.data;
        
        document.getElementById('assigned-users-list').innerHTML = users.length > 0 
            ? users.map(u => `<p>${u.email || u.uid}</p>`).join('')
            : '<p>No users assigned</p>';
        
        document.getElementById('assigned-entities-list').innerHTML = entities.length > 0
            ? entities.map(e => `<p>${e.name || e.id}</p>`).join('')
            : '<p>No entities assigned</p>';
    } catch (error) {
        console.error('Error loading assignments:', error);
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).style.display = 'block';
}

async function logout() {
    await signOut(auth);
    window.location.href = 'login.html';
}

// Make functions globally accessible
window.editConfig = editConfig;
window.deleteConfig = deleteConfig;
window.checkHealth = checkHealth;
window.showAssignmentModal = showAssignmentModal;
```

---

### Step 7: Update Admin Dashboard
**File**: `public/admin.html`

Add link to new Sheet Management page:

```html
<!-- In the navigation section -->
<nav class="auth-section">
    <a href="index.html">Home</a>
    <a href="profile.html">Profile</a>
    <a href="admin.html" class="active">Admin Dashboard</a>
    <a href="admin-sheets.html">Sheet Management</a> <!-- NEW -->
    <a href="admin-review.html">Review Queue</a>
    <button id="logout-btn">Logout</button>
</nav>
```

---

### Step 8: Update Styles
**File**: `public/styles.css`

Add styles for sheet management UI:

```css
/* Sheet Management Styles */

.sheets-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.sheet-config-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s;
}

.sheet-config-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.sheet-config-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
}

.sheet-config-header h3 {
    margin: 0;
    flex-grow: 1;
}

.badge-default {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.badge-status {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.badge-active {
    background: #10b981;
    color: white;
}

.badge-inactive {
    background: #6b7280;
    color: white;
}

.badge-error {
    background: #ef4444;
    color: white;
}

.sheet-config-body {
    margin-bottom: 15px;
}

.sheet-config-body p {
    margin: 8px 0;
    font-size: 14px;
}

.sheet-config-body code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
}

.sheet-config-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.verification-result {
    margin-top: 15px;
    padding: 15px;
    border-radius: 8px;
}

.verification-result.success {
    background: #d1fae5;
    border: 1px solid #10b981;
    color: #047857;
}

.verification-result.error {
    background: #fee2e2;
    border: 1px solid #ef4444;
    color: #b91c1c;
}

.tabs {
    display: flex;
    gap: 10px;
    margin: 20px 0;
    border-bottom: 2px solid #e5e7eb;
}

.tab-btn {
    background: none;
    border: none;
    padding: 10px 20px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: color 0.2s, border-color 0.2s;
}

.tab-btn.active {
    color: #667eea;
    border-bottom-color: #667eea;
}

.tab-content {
    padding: 20px 0;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

@media (max-width: 768px) {
    .sheets-list {
        grid-template-columns: 1fr;
    }
    
    .sheet-config-actions {
        flex-direction: column;
    }
    
    .tabs {
        flex-direction: column;
        border-bottom: none;
    }
    
    .tab-btn {
        border-left: 2px solid transparent;
        text-align: left;
        margin-bottom: 0;
    }
    
    .tab-btn.active {
        border-left-color: #667eea;
        border-bottom-color: transparent;
    }
}
```

---

## 📝 Testing Plan

### Test Cases

1. **Create Sheet Configuration**
   - Create new sheet config with valid Sheet ID
   - Verify sheet health check works
   - Set as default sheet
   - Verify it appears in list

2. **Assign Sheet to Entity**
   - Create an entity
   - Assign sheet config to entity
   - Upload receipt as user in that entity
   - Verify receipt goes to correct sheet

3. **Assign Sheet to User**
   - Assign sheet config directly to a user
   - Upload receipt as that user
   - Verify receipt goes to correct sheet (overrides entity sheet)

4. **Multiple Sheets**
   - Create 2-3 sheet configs
   - Assign to different entities
   - Upload receipts from users in different entities
   - Verify each goes to correct sheet

5. **Backward Compatibility**
   - User with no sheet assignment
   - Should fall back to default sheet
   - If no default, use env variable GOOGLE_SHEET_ID

6. **Health Check**
   - Test with valid sheet
   - Test with invalid/inaccessible sheet
   - Test with sheet missing service account permissions

7. **Bulk Operations**
   - Bulk assign 10+ users to a sheet
   - Verify all assignments succeed

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend Functions
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### Step 2: Deploy Frontend
```bash
firebase deploy --only hosting
```

### Step 3: Create Default Sheet Config (via Firestore Console)

1. Go to Firebase Console → Firestore
2. Create collection: `sheet_configs`
3. Add document with auto ID:
```json
{
  "name": "Default Sheet",
  "sheetId": "1gc-R5cKCOVFnnC0EsVJ_OIDXP-PIQ_pWcssr-HJujos",
  "isDefault": true,
  "createdAt": "2025-01-01T00:00:00Z",
  "createdBy": "admin",
  "lastModified": "2025-01-01T00:00:00Z",
  "config": {
    "mainTabName": "Sheet1",
    "accountantTabName": "Accountant_CSV_Ready",
    "createTabsIfMissing": true,
    "headerRow": 1
  },
  "assignedTo": {
    "type": "all"
  },
  "status": "active"
}
```

### Step 4: Test End-to-End
1. Log in as admin
2. Go to Sheet Management page
3. Create new sheet config
4. Assign to an entity or user
5. Upload receipt as that user
6. Verify receipt appears in correct sheet

---

## 📚 Documentation Updates

Update the following files:
- `README.md` - Add Phase 4 to completed features
- `TODO.md` - Mark Phase 4 as complete
- `ADMIN_GUIDE.md` - Add section on sheet management
- `USER_GUIDE.md` - Explain how receipts are routed to sheets

---

## 🎯 Success Criteria

Phase 4 is complete when:

- [ ] Admin can create multiple sheet configurations
- [ ] Admin can assign sheets to users or entities
- [ ] Receipts automatically route to correct sheet based on user/entity
- [ ] Sheet health verification works
- [ ] Backward compatible with existing single-sheet setup
- [ ] Bulk user assignment works
- [ ] Statistics tracked per sheet
- [ ] All tests pass
- [ ] Documentation updated

---

## 🔮 Future Enhancements (Phase 4.5)

### Sheet Templates
- Pre-configured sheet templates for common use cases
- One-click setup for new sheets

### Advanced Field Mapping
- Custom column mappings per sheet
- Support for additional custom fields

### Sheet Rotation
- Automatic monthly/yearly sheet rotation
- Archive old sheets

### Multi-Tenant Support
- Separate Firebase projects per tenant
- Cross-project sheet management

### Sheet Analytics Dashboard
- Visualize usage across all sheets
- Track performance metrics
- Identify bottlenecks

---

**Status**: 📝 Ready to Implement  
**Branch**: `feature/phase-4-multi-sheet-management`  
**Estimated Time**: 2-3 weeks  
**Last Updated**: December 17, 2025

