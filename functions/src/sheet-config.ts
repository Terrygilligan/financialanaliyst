// functions/src/sheet-config.ts
// Phase 4: Multi-Sheet Management - Sheet Configuration Service

import { getFirestore } from "firebase-admin/firestore";
import { sheets_v4 } from 'googleapis';

const db = getFirestore();

/**
 * Sheet Configuration interface
 */
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
 * 
 * Priority order:
 * 1. User-specific sheet assignment (highest priority)
 * 2. Entity-level sheet assignment
 * 3. Default sheet config (isDefault = true)
 * 4. null (caller should use GOOGLE_SHEET_ID from env)
 * 
 * @param userId - The user's Firebase Auth UID
 * @returns SheetConfig or null if none found
 */
export async function getSheetConfigForUser(userId: string): Promise<SheetConfig | null> {
  try {
    console.log(`[Sheet Config] Looking up sheet config for user: ${userId}`);
    
    // 1. Check if user has a direct sheet assignment
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.sheetConfigId) {
      const sheetConfigId = userDoc.data()!.sheetConfigId;
      console.log(`[Sheet Config] User has direct sheet assignment: ${sheetConfigId}`);
      
      const configDoc = await db.collection('sheet_configs').doc(sheetConfigId).get();
      if (configDoc.exists && configDoc.data()?.status === 'active') {
        console.log(`[Sheet Config] Found active user-specific config`);
        return { id: configDoc.id, ...configDoc.data() } as SheetConfig;
      } else {
        console.warn(`[Sheet Config] User's assigned config not found or inactive: ${sheetConfigId}`);
      }
    }
    
    // 2. Check if user's entity has a sheet assignment
    if (userDoc.exists && userDoc.data()?.entity) {
      const entityId = userDoc.data()!.entity;
      console.log(`[Sheet Config] User belongs to entity: ${entityId}`);
      
      const entityDoc = await db.collection('entities').doc(entityId).get();
      if (entityDoc.exists && entityDoc.data()?.sheetConfigId) {
        const sheetConfigId = entityDoc.data()!.sheetConfigId;
        console.log(`[Sheet Config] Entity has sheet assignment: ${sheetConfigId}`);
        
        const configDoc = await db.collection('sheet_configs').doc(sheetConfigId).get();
        if (configDoc.exists && configDoc.data()?.status === 'active') {
          console.log(`[Sheet Config] Found active entity-level config`);
          return { id: configDoc.id, ...configDoc.data() } as SheetConfig;
        } else {
          console.warn(`[Sheet Config] Entity's assigned config not found or inactive: ${sheetConfigId}`);
        }
      }
    }
    
    // 3. Fall back to default sheet config
    console.log(`[Sheet Config] Looking for default sheet config`);
    const defaultConfigQuery = await db.collection('sheet_configs')
      .where('isDefault', '==', true)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (!defaultConfigQuery.empty) {
      const defaultConfig = defaultConfigQuery.docs[0];
      console.log(`[Sheet Config] Found default config: ${defaultConfig.id}`);
      return { id: defaultConfig.id, ...defaultConfig.data() } as SheetConfig;
    }
    
    // 4. No config found - caller should use legacy GOOGLE_SHEET_ID
    console.log(`[Sheet Config] No sheet config found, falling back to environment variable`);
    return null;
  } catch (error) {
    console.error(`[Sheet Config] Error getting sheet config for user ${userId}:`, error);
    return null;
  }
}

/**
 * Get all active sheet configurations
 * 
 * @returns Array of active sheet configs
 */
export async function getAllSheetConfigs(): Promise<SheetConfig[]> {
  try {
    const snapshot = await db.collection('sheet_configs')
      .where('status', '==', 'active')
      .orderBy('name')
      .get();
    
    const configs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SheetConfig));
    
    console.log(`[Sheet Config] Found ${configs.length} active sheet configs`);
    return configs;
  } catch (error) {
    console.error('[Sheet Config] Error fetching all sheet configs:', error);
    return [];
  }
}

/**
 * Get a specific sheet configuration by ID
 * 
 * @param configId - The sheet config ID
 * @returns SheetConfig or null if not found
 */
export async function getSheetConfigById(configId: string): Promise<SheetConfig | null> {
  try {
    const configDoc = await db.collection('sheet_configs').doc(configId).get();
    
    if (!configDoc.exists) {
      console.warn(`[Sheet Config] Config not found: ${configId}`);
      return null;
    }
    
    return { id: configDoc.id, ...configDoc.data() } as SheetConfig;
  } catch (error) {
    console.error(`[Sheet Config] Error getting config ${configId}:`, error);
    return null;
  }
}

/**
 * Create a new sheet configuration
 * 
 * @param config - Sheet config data (without id, createdAt, lastModified)
 * @param creatorUid - Admin UID who created this config
 * @returns The new config ID
 */
export async function createSheetConfig(
  config: Omit<SheetConfig, 'id' | 'createdAt' | 'lastModified'>,
  creatorUid: string
): Promise<string> {
  try {
    const newConfig = {
      ...config,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      createdBy: creatorUid
    };
    
    // If this is set as default, unset any existing defaults
    if (newConfig.isDefault) {
      console.log(`[Sheet Config] Unsetting existing default configs`);
      const existingDefaults = await db.collection('sheet_configs')
        .where('isDefault', '==', true)
        .get();
      
      const batch = db.batch();
      existingDefaults.docs.forEach(doc => {
        batch.update(doc.ref, { isDefault: false });
      });
      await batch.commit();
    }
    
    const docRef = await db.collection('sheet_configs').add(newConfig);
    console.log(`[Sheet Config] Created new config: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('[Sheet Config] Error creating config:', error);
    throw error;
  }
}

/**
 * Update sheet configuration
 * 
 * @param configId - The config ID to update
 * @param updates - Partial config updates
 */
export async function updateSheetConfig(
  configId: string,
  updates: Partial<SheetConfig>
): Promise<void> {
  try {
    // Remove fields that shouldn't be updated directly
    const { id, createdAt, createdBy, ...safeUpdates } = updates as any;
    
    // If setting this as default, unset any existing defaults
    if (safeUpdates.isDefault === true) {
      console.log(`[Sheet Config] Unsetting existing default configs`);
      const existingDefaults = await db.collection('sheet_configs')
        .where('isDefault', '==', true)
        .get();
      
      const batch = db.batch();
      existingDefaults.docs.forEach(doc => {
        if (doc.id !== configId) {
          batch.update(doc.ref, { isDefault: false });
        }
      });
      await batch.commit();
    }
    
    await db.collection('sheet_configs').doc(configId).update({
      ...safeUpdates,
      lastModified: new Date().toISOString()
    });
    
    console.log(`[Sheet Config] Updated config: ${configId}`);
  } catch (error) {
    console.error(`[Sheet Config] Error updating config ${configId}:`, error);
    throw error;
  }
}

/**
 * Delete (deactivate) sheet configuration
 * 
 * @param configId - The config ID to delete
 */
export async function deleteSheetConfig(configId: string): Promise<void> {
  try {
    await db.collection('sheet_configs').doc(configId).update({
      status: 'inactive',
      lastModified: new Date().toISOString()
    });
    
    console.log(`[Sheet Config] Deactivated config: ${configId}`);
  } catch (error) {
    console.error(`[Sheet Config] Error deleting config ${configId}:`, error);
    throw error;
  }
}

/**
 * Verify sheet health (accessibility, permissions, tabs)
 * 
 * @param sheetId - Google Sheet ID
 * @param sheetsClient - Google Sheets API client
 * @returns Health status object
 */
export async function verifySheetHealth(
  sheetId: string,
  sheetsClient: sheets_v4.Sheets
): Promise<SheetConfig['healthStatus']> {
  try {
    console.log(`[Sheet Config] Verifying health for sheet: ${sheetId}`);
    
    // Try to get sheet metadata
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'sheets.properties.title'
    });
    
    const sheets = response.data.sheets || [];
    const sheetTitles = sheets.map(s => s.properties?.title || '');
    
    console.log(`[Sheet Config] Sheet accessible, found ${sheets.length} tabs`);
    
    return {
      accessible: true,
      hasPermissions: true,
      tabsExist: sheetTitles.length > 0,
      errorMessage: undefined
    };
  } catch (error: any) {
    console.error(`[Sheet Config] Sheet health check failed for ${sheetId}:`, error.message);
    
    return {
      accessible: false,
      hasPermissions: false,
      tabsExist: false,
      errorMessage: error.message || 'Unknown error'
    };
  }
}

/**
 * Assign sheet config to user
 * 
 * @param userId - User's Firebase Auth UID
 * @param sheetConfigId - Sheet config ID to assign
 */
export async function assignSheetToUser(
  userId: string,
  sheetConfigId: string
): Promise<void> {
  try {
    await db.collection('users').doc(userId).set({
      sheetConfigId: sheetConfigId,
      lastModified: new Date().toISOString()
    }, { merge: true });
    
    console.log(`[Sheet Config] Assigned sheet ${sheetConfigId} to user ${userId}`);
  } catch (error) {
    console.error(`[Sheet Config] Error assigning sheet to user:`, error);
    throw error;
  }
}

/**
 * Assign sheet config to entity
 * 
 * @param entityId - Entity ID
 * @param sheetConfigId - Sheet config ID to assign
 */
export async function assignSheetToEntity(
  entityId: string,
  sheetConfigId: string
): Promise<void> {
  try {
    await db.collection('entities').doc(entityId).set({
      sheetConfigId: sheetConfigId,
      lastModified: new Date().toISOString()
    }, { merge: true });
    
    console.log(`[Sheet Config] Assigned sheet ${sheetConfigId} to entity ${entityId}`);
  } catch (error) {
    console.error(`[Sheet Config] Error assigning sheet to entity:`, error);
    throw error;
  }
}

/**
 * Get users assigned to a sheet config
 * 
 * @param configId - Sheet config ID
 * @returns Array of user documents
 */
export async function getUsersForSheetConfig(configId: string): Promise<any[]> {
  try {
    const usersSnapshot = await db.collection('users')
      .where('sheetConfigId', '==', configId)
      .get();
    
    const users = usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
    
    console.log(`[Sheet Config] Found ${users.length} users for config ${configId}`);
    return users;
  } catch (error) {
    console.error(`[Sheet Config] Error getting users for config ${configId}:`, error);
    return [];
  }
}

/**
 * Get entities assigned to a sheet config
 * 
 * @param configId - Sheet config ID
 * @returns Array of entity documents
 */
export async function getEntitiesForSheetConfig(configId: string): Promise<any[]> {
  try {
    const entitiesSnapshot = await db.collection('entities')
      .where('sheetConfigId', '==', configId)
      .get();
    
    const entities = entitiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`[Sheet Config] Found ${entities.length} entities for config ${configId}`);
    return entities;
  } catch (error) {
    console.error(`[Sheet Config] Error getting entities for config ${configId}:`, error);
    return [];
  }
}

/**
 * Update sheet statistics after successful write
 * 
 * @param configId - Sheet config ID
 */
export async function incrementSheetStats(configId: string): Promise<void> {
  try {
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
    
    console.log(`[Sheet Config] Incremented stats for config ${configId}`);
  } catch (error) {
    console.error(`[Sheet Config] Error updating sheet stats:`, error);
    // Non-critical, don't throw
  }
}

