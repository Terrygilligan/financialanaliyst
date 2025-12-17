// functions/src/admin-sheet-management.ts
// Phase 4: Multi-Sheet Management - Admin Cloud Functions

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { 
  createSheetConfig, 
  updateSheetConfig, 
  deleteSheetConfig,
  getAllSheetConfigs,
  getSheetConfigById,
  verifySheetHealth,
  assignSheetToUser,
  assignSheetToEntity,
  removeSheetAssignmentFromUser,
  removeSheetAssignmentFromEntity,
  getUsersForSheetConfig,
  getEntitiesForSheetConfig,
  SheetConfig
} from "./sheet-config";
import { getSheetsClient } from "./sheets";

/**
 * Verify user is admin (helper function)
 * 
 * @param request - Cloud Function request object
 * @returns The admin's UID
 * @throws HttpsError if not admin
 */
function verifyAdmin(request: any): string {
  if (!request.auth) {
    console.error('[Admin Sheet] Unauthenticated request');
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  if (!request.auth.token.admin) {
    console.error(`[Admin Sheet] Non-admin user attempted access: ${request.auth.uid}`);
    throw new HttpsError('permission-denied', 'User must be an admin');
  }
  
  console.log(`[Admin Sheet] Admin verified: ${request.auth.uid}`);
  return request.auth.uid;
}

/**
 * Create a new sheet configuration
 * 
 * Admin-only Cloud Function to create a new Google Sheet configuration.
 * 
 * @param request.data.name - Display name for the sheet config
 * @param request.data.sheetId - Google Sheet ID
 * @param request.data.config - Configuration object (tab names, etc.)
 * @param request.data.assignedTo - Assignment configuration
 * @param request.data.isDefault - Whether this is the default sheet
 * @returns { success: true, configId: string, message: string }
 */
export const createSheetConfiguration = onCall(
  { region: "us-central1" },
  async (request) => {
    const adminUid = verifyAdmin(request);
    
    const { name, sheetId, config, assignedTo, isDefault } = request.data;
    
    // Validate required fields
    if (!name || !sheetId) {
      throw new HttpsError('invalid-argument', 'Name and sheetId are required');
    }
    
    // Validate sheetId format (basic check)
    if (typeof sheetId !== 'string' || sheetId.length < 10) {
      throw new HttpsError('invalid-argument', 'Invalid Google Sheet ID format');
    }
    
    console.log(`[Admin Sheet] Creating new config: ${name} (${sheetId})`);
    
    try {
      const newConfig: Omit<SheetConfig, 'id' | 'createdAt' | 'lastModified'> = {
        name,
        sheetId,
        isDefault: isDefault || false,
        createdBy: adminUid,
        config: config || {
          mainTabName: 'Sheet1',
          accountantTabName: 'Accountant_CSV_Ready',
          createTabsIfMissing: true,
          headerRow: 1
        },
        assignedTo: assignedTo || { type: 'all' },
        status: 'active'
      };
      
      const configId = await createSheetConfig(newConfig, adminUid);
      
      console.log(`[Admin Sheet] ✅ Config created: ${configId}`);
      
      return { 
        success: true, 
        configId,
        message: 'Sheet configuration created successfully' 
      };
    } catch (error: any) {
      console.error('[Admin Sheet] ❌ Error creating config:', error);
      throw new HttpsError('internal', `Failed to create configuration: ${error.message}`);
    }
  }
);

/**
 * Update an existing sheet configuration
 * 
 * Admin-only Cloud Function to update sheet configuration settings.
 * 
 * @param request.data.configId - The config ID to update
 * @param request.data.updates - Partial updates to apply
 * @returns { success: true, message: string }
 */
export const updateSheetConfiguration = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { configId, updates } = request.data;
    
    if (!configId) {
      throw new HttpsError('invalid-argument', 'configId is required');
    }
    
    if (!updates || typeof updates !== 'object') {
      throw new HttpsError('invalid-argument', 'updates object is required');
    }
    
    console.log(`[Admin Sheet] Updating config: ${configId}`);
    
    try {
      // Verify config exists
      const existingConfig = await getSheetConfigById(configId);
      if (!existingConfig) {
        throw new HttpsError('not-found', `Config ${configId} not found`);
      }
      
      await updateSheetConfig(configId, updates);
      
      console.log(`[Admin Sheet] ✅ Config updated: ${configId}`);
      
      return { 
        success: true, 
        message: 'Sheet configuration updated successfully' 
      };
    } catch (error: any) {
      console.error('[Admin Sheet] ❌ Error updating config:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', `Failed to update configuration: ${error.message}`);
    }
  }
);

/**
 * Delete (deactivate) a sheet configuration
 * 
 * Admin-only Cloud Function to deactivate a sheet configuration.
 * This is a soft delete - the config status is set to 'inactive'.
 * 
 * @param request.data.configId - The config ID to delete
 * @returns { success: true, message: string }
 */
export const deleteSheetConfiguration = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { configId } = request.data;
    
    if (!configId) {
      throw new HttpsError('invalid-argument', 'configId is required');
    }
    
    console.log(`[Admin Sheet] Deleting config: ${configId}`);
    
    try {
      // Verify config exists
      const existingConfig = await getSheetConfigById(configId);
      if (!existingConfig) {
        throw new HttpsError('not-found', `Config ${configId} not found`);
      }
      
      // Don't allow deleting the default config if it's the only one
      if (existingConfig.isDefault) {
        const allConfigs = await getAllSheetConfigs();
        if (allConfigs.length === 1) {
          throw new HttpsError('failed-precondition', 'Cannot delete the only default configuration');
        }
      }
      
      await deleteSheetConfig(configId);
      
      console.log(`[Admin Sheet] ✅ Config deleted: ${configId}`);
      
      return { 
        success: true, 
        message: 'Sheet configuration deleted successfully' 
      };
    } catch (error: any) {
      console.error('[Admin Sheet] ❌ Error deleting config:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', `Failed to delete configuration: ${error.message}`);
    }
  }
);

/**
 * Get all sheet configurations
 * 
 * Admin-only Cloud Function to retrieve all active sheet configurations.
 * 
 * @returns { success: true, configs: SheetConfig[] }
 */
export const getSheetConfigurations = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    console.log('[Admin Sheet] Fetching all configs');
    
    try {
      const configs = await getAllSheetConfigs();
      
      console.log(`[Admin Sheet] ✅ Found ${configs.length} configs`);
      
      return { 
        success: true, 
        configs 
      };
    } catch (error: any) {
      console.error('[Admin Sheet] ❌ Error fetching configs:', error);
      throw new HttpsError('internal', `Failed to fetch configurations: ${error.message}`);
    }
  }
);

/**
 * Verify sheet health
 * 
 * Admin-only Cloud Function to check if a Google Sheet is accessible
 * and has the correct permissions.
 * 
 * @param request.data.sheetId - Google Sheet ID to verify
 * @returns { success: true, healthStatus: object }
 */
export const checkSheetHealth = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { sheetId } = request.data;
    
    if (!sheetId) {
      throw new HttpsError('invalid-argument', 'sheetId is required');
    }
    
    console.log(`[Admin Sheet] Checking health for sheet: ${sheetId}`);
    
    try {
      const sheetsClient = getSheetsClient();
      const healthStatus = await verifySheetHealth(sheetId, sheetsClient);
      
      console.log(`[Admin Sheet] ✅ Health check complete: accessible=${healthStatus.accessible}`);
      
      return { 
        success: true, 
        healthStatus 
      };
    } catch (error: any) {
      console.error('[Admin Sheet] ❌ Error checking health:', error);
      throw new HttpsError('internal', `Failed to check sheet health: ${error.message}`);
    }
  }
);

/**
 * Assign sheet configuration to a user
 * 
 * Admin-only Cloud Function to assign a specific sheet configuration to a user.
 * This overrides entity-level assignments.
 * 
 * @param request.data.userId - User's Firebase Auth UID
 * @param request.data.sheetConfigId - Sheet config ID to assign
 * @returns { success: true, message: string }
 */
export const assignSheetConfigToUser = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { userId, sheetConfigId } = request.data;
    
    if (!userId || !sheetConfigId) {
      throw new HttpsError('invalid-argument', 'userId and sheetConfigId are required');
    }
    
    console.log(`[Admin Sheet] Assigning sheet ${sheetConfigId} to user ${userId}`);
    
    try {
      // Verify config exists and is active
      const config = await getSheetConfigById(sheetConfigId);
      if (!config) {
        throw new HttpsError('not-found', `Config ${sheetConfigId} not found`);
      }
      
      if (config.status !== 'active') {
        throw new HttpsError('failed-precondition', `Config ${sheetConfigId} is not active`);
      }
      
      await assignSheetToUser(userId, sheetConfigId);
      
      console.log(`[Admin Sheet] ✅ Sheet assigned to user`);
      
      return { 
        success: true, 
        message: 'Sheet assigned to user successfully' 
      };
    } catch (error: any) {
      console.error('[Admin Sheet] ❌ Error assigning sheet to user:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', `Failed to assign sheet: ${error.message}`);
    }
  }
);

/**
 * Assign sheet configuration to an entity
 * 
 * Admin-only Cloud Function to assign a sheet configuration to an entity.
 * All users in this entity will use this sheet (unless they have a user-level override).
 * 
 * @param request.data.entityId - Entity ID
 * @param request.data.sheetConfigId - Sheet config ID to assign
 * @returns { success: true, message: string }
 */
export const assignSheetConfigToEntity = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { entityId, sheetConfigId } = request.data;
    
    if (!entityId || !sheetConfigId) {
      throw new HttpsError('invalid-argument', 'entityId and sheetConfigId are required');
    }
    
    console.log(`[Admin Sheet] Assigning sheet ${sheetConfigId} to entity ${entityId}`);
    
    try {
      // Verify config exists and is active
      const config = await getSheetConfigById(sheetConfigId);
      if (!config) {
        throw new HttpsError('not-found', `Config ${sheetConfigId} not found`);
      }
      
      if (config.status !== 'active') {
        throw new HttpsError('failed-precondition', `Config ${sheetConfigId} is not active`);
      }
      
      await assignSheetToEntity(entityId, sheetConfigId);
      
      console.log(`[Admin Sheet] ✅ Sheet assigned to entity`);
      
      return { 
        success: true, 
        message: 'Sheet assigned to entity successfully' 
      };
    } catch (error: any) {
      console.error('[Admin Sheet] ❌ Error assigning sheet to entity:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', `Failed to assign sheet: ${error.message}`);
    }
  }
);

/**
 * Get users and entities for a sheet configuration
 * 
 * Admin-only Cloud Function to retrieve all users and entities
 * assigned to a specific sheet configuration.
 * 
 * @param request.data.configId - Sheet config ID
 * @returns { success: true, users: array, entities: array }
 */
export const getSheetConfigAssignments = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { configId } = request.data;
    
    if (!configId) {
      throw new HttpsError('invalid-argument', 'configId is required');
    }
    
    console.log(`[Admin Sheet] Fetching assignments for config: ${configId}`);
    
    try {
      // Verify config exists
      const config = await getSheetConfigById(configId);
      if (!config) {
        throw new HttpsError('not-found', `Config ${configId} not found`);
      }
      
      const users = await getUsersForSheetConfig(configId);
      const entities = await getEntitiesForSheetConfig(configId);
      
      console.log(`[Admin Sheet] ✅ Found ${users.length} users, ${entities.length} entities`);
      
      return { 
        success: true, 
        users,
        entities
      };
    } catch (error: any) {
      console.error('[Admin Sheet] ❌ Error fetching assignments:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', `Failed to fetch assignments: ${error.message}`);
    }
  }
);

/**
 * Bulk assign users to a sheet configuration
 * 
 * Admin-only Cloud Function to assign multiple users to a sheet configuration.
 * 
 * @param request.data.userIds - Array of user Firebase Auth UIDs
 * @param request.data.sheetConfigId - Sheet config ID to assign
 * @returns { success: true, message: string, successful: number, failed: number }
 */
export const bulkAssignUsersToSheet = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { userIds, sheetConfigId } = request.data;
    
    if (!userIds || !Array.isArray(userIds) || !sheetConfigId) {
      throw new HttpsError('invalid-argument', 'userIds (array) and sheetConfigId are required');
    }
    
    if (userIds.length === 0) {
      throw new HttpsError('invalid-argument', 'userIds array cannot be empty');
    }
    
    if (userIds.length > 100) {
      throw new HttpsError('invalid-argument', 'Maximum 100 users per bulk operation');
    }
    
    console.log(`[Admin Sheet] Bulk assigning ${userIds.length} users to sheet ${sheetConfigId}`);
    
    try {
      // Verify config exists and is active
      const config = await getSheetConfigById(sheetConfigId);
      if (!config) {
        throw new HttpsError('not-found', `Config ${sheetConfigId} not found`);
      }
      
      if (config.status !== 'active') {
        throw new HttpsError('failed-precondition', `Config ${sheetConfigId} is not active`);
      }
      
      // Assign all users (with Promise.allSettled to handle partial failures)
      const results = await Promise.allSettled(
        userIds.map(userId => assignSheetToUser(userId, sheetConfigId))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`[Admin Sheet] ✅ Bulk assignment complete: ${successful} successful, ${failed} failed`);
      
      return { 
        success: true, 
        message: `Assigned ${successful} users successfully, ${failed} failed`,
        successful,
        failed
      };
    } catch (error: any) {
      console.error('[Admin Sheet] ❌ Error in bulk assignment:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', `Failed to bulk assign: ${error.message}`);
    }
  }
);

/**
 * Remove sheet assignment from user
 * 
 * Admin-only Cloud Function to remove a user's sheet assignment.
 * User will fall back to entity or default sheet.
 * 
 * @param request.data.userId - User's Firebase Auth UID
 * @returns { success: true, message: string }
 */
export const removeUserSheetAssignment = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { userId } = request.data;
    
    if (!userId) {
      throw new HttpsError('invalid-argument', 'userId is required');
    }
    
    console.log(`[Admin Sheet] Removing sheet assignment from user ${userId}`);
    
    try {
      await removeSheetAssignmentFromUser(userId);
      
      console.log(`[Admin Sheet] ✅ Sheet assignment removed from user`);
      
      return { 
        success: true, 
        message: 'Sheet assignment removed successfully' 
      };
    } catch (error: any) {
      console.error('[Admin Sheet] ❌ Error removing assignment:', error);
      throw new HttpsError('internal', `Failed to remove assignment: ${error.message}`);
    }
  }
);

/**
 * Remove sheet assignment from entity
 * Admin-only endpoint
 */
export const removeEntitySheetAssignment = onCall(
  { region: "us-central1" },
  async (request) => {
    verifyAdmin(request);
    
    const { entityId } = request.data;
    
    if (!entityId) {
      throw new HttpsError('invalid-argument', 'entityId is required');
    }
    
    console.log(`[Admin Sheet] Removing sheet assignment from entity ${entityId}`);
    
    try {
      await removeSheetAssignmentFromEntity(entityId);
      
      console.log(`[Admin Sheet] ✅ Sheet assignment removed from entity`);
      
      return { 
        success: true, 
        message: 'Entity sheet assignment removed successfully' 
      };
    } catch (error: any) {
      console.error('[Admin Sheet] ❌ Error removing entity assignment:', error);
      throw new HttpsError('internal', `Failed to remove entity assignment: ${error.message}`);
    }
  }
);

