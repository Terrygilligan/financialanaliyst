// functions/src/business-lookup.ts
// Helper functions to look up business information for users

import { getFirestore } from "firebase-admin/firestore";
import { getBusinessByBookkeeper, getBusiness, Business } from "./business-provisioning";

const db = getFirestore();

/**
 * Look up business for a user (driver or bookkeeper)
 * 
 * Priority:
 * 1. Check if user is assigned to a business (via business_assignments)
 * 2. Check bookkeeper lookup (if user is the owner)
 * 
 * @param userId - Firebase Auth UID
 * @returns Business object or null
 */
export async function lookupBusinessForUser(userId: string): Promise<Business | null> {
  try {
    // Method 1: Check business_assignments collection
    const assignmentDoc = await db.collection('business_assignments').doc(userId).get();
    if (assignmentDoc.exists) {
      const assignmentData = assignmentDoc.data();
      if (assignmentData?.businessId) {
        const business = await getBusiness(assignmentData.businessId);
        if (business && business.status === 'active') {
          console.log(`[Business Lookup] Found business via assignment: ${business.name}`);
          return business;
        }
      }
    }
    
    // Method 2: Try bookkeeper lookup (if user is the owner)
    const business = await getBusinessByBookkeeper(userId);
    if (business && business.status === 'active') {
      console.log(`[Business Lookup] Found business via bookkeeper lookup: ${business.name}`);
      return business;
    }
    
    console.log(`[Business Lookup] No business found for user: ${userId}`);
    return null;
    
  } catch (error) {
    console.error(`[Business Lookup] Error looking up business for user ${userId}:`, error);
    return null;
  }
}

/**
 * Get business settings for a user
 * 
 * @param userId - Firebase Auth UID
 * @returns Business settings or defaults
 */
export async function getBusinessSettingsForUser(userId: string): Promise<{
  currency?: string;
  timezone?: string;
}> {
  const business = await lookupBusinessForUser(userId);
  
  if (business && business.settings) {
    return business.settings;
  }
  
  // Return defaults
  return {
    currency: 'GBP',
    timezone: 'Europe/London'
  };
}

