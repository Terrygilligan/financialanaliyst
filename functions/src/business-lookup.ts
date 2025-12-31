// functions/src/business-lookup.ts
// Helper functions to look up business information for users

import { getFirestore } from "firebase-admin/firestore";
import { getBusinessByBookkeeper, getBusiness, Business } from "./business-provisioning";

const db = getFirestore();

/**
 * Look up business for a user (driver or bookkeeper)
 * 
 * Priority:
 * 1. Check if user is a bookkeeper (has businessId in /users/{userId})
 * 2. Check if user is assigned to a business (via business_assignments)
 * 3. Fall back to entity lookup (backward compatibility)
 * 
 * @param userId - Firebase Auth UID
 * @returns Business object or null
 */
export async function lookupBusinessForUser(userId: string): Promise<Business | null> {
  try {
    // Method 1: Check if user is a bookkeeper
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      
      // Check if user has a businessId (bookkeeper)
      if (userData?.businessId) {
        const business = await getBusiness(userData.businessId);
        if (business && business.status === 'active') {
          console.log(`[Business Lookup] Found business for bookkeeper: ${business.name}`);
          return business;
        }
      }
      
      // Check if user is assigned to a business (driver)
      if (userData?.assignedBusinessId) {
        const business = await getBusiness(userData.assignedBusinessId);
        if (business && business.status === 'active') {
          console.log(`[Business Lookup] Found assigned business: ${business.name}`);
          return business;
        }
      }
    }
    
    // Method 2: Check business_assignments collection
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
    
    // Method 3: Try bookkeeper lookup (in case user is bookkeeper but businessId not set)
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

