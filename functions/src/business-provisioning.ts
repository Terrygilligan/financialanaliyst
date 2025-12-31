// functions/src/business-provisioning.ts
// Automated Business Provisioning System for Multi-Tenant SaaS
// Focuses solely on Firestore silo initialization and identity setup.

import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { logger } from "firebase-functions/v2";

const db = getFirestore();
const auth = getAuth();

/**
 * Business interface matching the new SaaS Silo structure
 */
export interface Business {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  bookkeeperEmail: string;
  bookkeeperUid: string;
  status: 'active' | 'suspended';
  settings: {
    baseCurrency: string;
    timezone: string;
  };
  stats?: {
    totalReceipts: number;
    totalAmount: number;
    lastReceiptAt?: string;
  };
}

/**
 * Provision a new business silo in Firestore and assign custom claims to the owner.
 * 
 * @param businessName - Name of the business
 * @param bookkeeperUid - Firebase Auth UID of the bookkeeper
 * @param bookkeeperEmail - Email of the bookkeeper
 * @returns Business document data
 */
export async function provisionBusiness(
  businessName: string,
  bookkeeperUid: string,
  bookkeeperEmail: string
): Promise<Business> {
  const businessId = `business-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('[SaaS Provisioning] Starting silo initialization', {
    businessId,
    businessName,
    bookkeeperUid
  });

  const businessData: Business = {
    id: businessId,
    name: businessName,
    createdAt: new Date().toISOString(),
    createdBy: bookkeeperUid,
    bookkeeperEmail,
    bookkeeperUid,
    status: 'active',
    settings: {
      baseCurrency: 'GBP',
      timezone: 'Europe/London'
    },
    stats: {
      totalReceipts: 0,
      totalAmount: 0
    }
  };

  try {
    // 1. Create the business silo in Firestore using a transaction
    await db.runTransaction(async (transaction) => {
      const businessRef = db.collection('businesses').doc(businessId);
      
      const businessDoc = await transaction.get(businessRef);
      if (businessDoc.exists) {
        throw new Error('Business ID collision detected');
      }
      
      transaction.set(businessRef, businessData);
    });

    // 2. Assign Custom Claims to the bookkeeper (Identity Layer)
    // This is the "tattoo" that enables access to the silo
    await auth.setCustomUserClaims(bookkeeperUid, { 
      businessId: businessId, 
      role: 'bookkeeper' 
    });

    // 3. Create a record in the top-level user_lookup collection
    // This allows unauthenticated password reset flows to find the tenantId
    await db.collection('user_lookup').doc(bookkeeperEmail.toLowerCase()).set({
      businessId: businessId,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    logger.info('[SaaS Provisioning] Silo initialized and custom claims assigned', {
      businessId,
      owner: bookkeeperUid
    });

    return businessData;
    
  } catch (error: any) {
    logger.error('[SaaS Provisioning] Error during provisioning', {
      businessId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get business by ID
 */
export async function getBusiness(businessId: string): Promise<Business | null> {
  const doc = await db.collection('businesses').doc(businessId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as Business;
}

/**
 * Get business by bookkeeper UID
 */
export async function getBusinessByBookkeeper(bookkeeperUid: string): Promise<Business | null> {
  const snapshot = await db.collection('businesses')
    .where('bookkeeperUid', '==', bookkeeperUid)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Business;
}
