// functions/src/business-management.ts
// Cloud Functions for SaaS Business Management (Silo-based)

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { 
  provisionBusiness, 
  getBusiness, 
  getBusinessByBookkeeper,
  Business 
} from "./business-provisioning";

const db = getFirestore();
const auth = getAuth();

/**
 * Verify user is authenticated
 */
async function verifyAuth(request: any): Promise<string> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  return request.auth.uid;
}

/**
 * Cloud Function: Provision a new business silo
 * 
 * This is called when a bookkeeper signs up. It:
 * - Creates a Firestore document in /businesses/{id}
 * - Sets the businessId custom claim on the user
 */
export const provisionNewBusiness = onCall(
  { region: "us-central1" },
  async (request) => {
    const uid = await verifyAuth(request);
    const { businessName } = request.data;
    
    if (!businessName || typeof businessName !== 'string' || businessName.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'businessName is required');
    }
    
    const user = request.auth!.token;
    const bookkeeperEmail = user.email;
    
    if (!bookkeeperEmail) {
      throw new HttpsError('invalid-argument', 'User email is required');
    }
    
    logger.info('[Silo Management] Provisioning business', {
      businessName,
      bookkeeperEmail,
      uid
    });
    
    try {
      // Check if user already has a business
      const existingBusiness = await getBusinessByBookkeeper(uid);
      if (existingBusiness) {
        logger.warn('[Silo Management] User already has a business', { uid, existingId: existingBusiness.id });
        throw new HttpsError('already-exists', 'User already has a business.');
      }
      
      // Provision the business silo and assign custom claims
      const business = await provisionBusiness(
        businessName.trim(),
        uid,
        bookkeeperEmail
      );
      
      // Update user document with businessId reference
      await db.collection('users').doc(uid).set({
        businessId: business.id,
        role: 'bookkeeper',
        businessName: business.name
      }, { merge: true });
      
      logger.info('[Silo Management] Business provisioned successfully', {
        businessId: business.id,
        uid
      });
      
      return {
        success: true,
        business: {
          id: business.id,
          name: business.name,
          status: business.status
        }
      };
      
    } catch (error: any) {
      logger.error('[Silo Management] Error provisioning business', {
        error: error.message,
        uid
      });
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', `Failed to provision business: ${error.message}`);
    }
  }
);

/**
 * Cloud Function: Get business silo details
 */
export const getBusinessDetails = onCall(
  { region: "us-central1" },
  async (request) => {
    const uid = await verifyAuth(request);
    const { businessId } = request.data;
    
    let business: Business | null;
    
    if (businessId) {
      business = await getBusiness(businessId);
      
      // Security: Only allow access if the user has the matching businessId claim
      if (business && request.auth!.token.businessId !== businessId && request.auth!.token.admin !== true) {
        throw new HttpsError('permission-denied', 'Unauthorized access to this business silo');
      }
    } else {
      // If no ID provided, try to find the business where the user is the bookkeeper
      business = await getBusinessByBookkeeper(uid);
    }
    
    if (!business) {
      throw new HttpsError('not-found', 'Business silo not found');
    }
    
    return {
      success: true,
      business: {
        id: business.id,
        name: business.name,
        settings: business.settings,
        status: business.status,
        stats: business.stats
      }
    };
  }
);

/**
 * Cloud Function: Update business silo settings
 */
export const updateBusinessSettings = onCall(
  { region: "us-central1" },
  async (request) => {
    const uid = await verifyAuth(request);
    const { businessId, settings } = request.data;
    
    if (!businessId) {
      throw new HttpsError('invalid-argument', 'businessId is required');
    }
    
    const business = await getBusiness(businessId);
    if (!business) {
      throw new HttpsError('not-found', 'Business silo not found');
    }
    
    // Security: Only the bookkeeper or a global admin can update settings
    if (business.bookkeeperUid !== uid && request.auth!.token.admin !== true) {
      throw new HttpsError('permission-denied', 'Only the owner can update business settings');
    }
    
    const updateData: any = {};
    if (settings.baseCurrency !== undefined) updateData['settings.baseCurrency'] = settings.baseCurrency;
    if (settings.timezone !== undefined) updateData['settings.timezone'] = settings.timezone;
    if (settings.name !== undefined) updateData['name'] = settings.name;
    
    await db.collection('businesses').doc(businessId).update(updateData);
    
    logger.info('[Silo Management] Settings updated', { businessId });
    
    return {
      success: true,
      message: 'Business settings updated successfully'
    };
  }
);

/**
 * Cloud Function: Add authorized user to business silo
 */
export const addAuthorizedUser = onCall(
  { region: "us-central1" },
  async (request) => {
    const uid = await verifyAuth(request);
    const { businessId, userEmail } = request.data;
    
    if (!businessId || !userEmail) {
      throw new HttpsError('invalid-argument', 'businessId and userEmail are required');
    }
    
    const business = await getBusiness(businessId);
    if (!business) {
      throw new HttpsError('not-found', 'Business silo not found');
    }
    
    if (business.bookkeeperUid !== uid && request.auth!.token.admin !== true) {
      throw new HttpsError('permission-denied', 'Unauthorized to manage users for this business');
    }
    
    try {
      // 1. Find user by email
      const userRecord = await auth.getUserByEmail(userEmail);
      
      // 2. Assign the businessId claim to the target user
      const existingClaims = userRecord.customClaims || {};
      await auth.setCustomUserClaims(userRecord.uid, {
        ...existingClaims,
        businessId: businessId,
        role: 'driver' // Default role for added users
      });
      
      // 3. Update the user's document
      await db.collection('users').doc(userRecord.uid).set({
        businessId: businessId,
        role: 'driver'
      }, { merge: true });
      
      logger.info('[Silo Management] User added to business silo', { businessId, userEmail });
      
      return {
        success: true,
        message: `User ${userEmail} successfully added to business ${business.name}`
      };
      
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        throw new HttpsError('not-found', 'User not found in authentication system');
      }
      throw new HttpsError('internal', `Failed to add user: ${error.message}`);
    }
  }
);
