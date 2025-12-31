// functions/src/entities.ts

import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Entity information structure
 */
export interface EntityInfo {
    id: string;
    name: string;
    description?: string;
    createdAt?: string;
}

/**
 * Lookup entity for a user based on their user ID and business silo.
 * 
 * @param userId - The user's Firebase Auth UID
 * @param businessId - The business silo ID
 * @returns The entity name (or 'Unassigned' if not found)
 */
export async function lookupEntityForUser(userId: string, businessId: string): Promise<string> {
    try {
        // Check for entity assignment within the business silo
        const entityAssignmentDoc = await db.collection('businesses').doc(businessId)
                                             .collection('entity_assignments').doc(userId).get();
        
        if (entityAssignmentDoc.exists) {
            const assignmentData = entityAssignmentDoc.data();
            if (assignmentData?.entityId) {
                // Look up the entity name from business-specific entities collection
                const entityDoc = await db.collection('businesses').doc(businessId)
                                           .collection('entities').doc(assignmentData.entityId).get();
                if (entityDoc.exists) {
                    const entityData = entityDoc.data() as EntityInfo;
                    return entityData.name || 'Unassigned';
                }
            }
        }

        // Fallback: Check top-level users collection (if still partially used)
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.entity) {
                const entityDoc = await db.collection('businesses').doc(businessId)
                                           .collection('entities').doc(userData.entity).get();
                if (entityDoc.exists) {
                    return (entityDoc.data() as EntityInfo).name || 'Unassigned';
                }
                return userData.entity;
            }
        }

        return 'Unassigned';
    } catch (error) {
        console.error(`Error looking up entity for user ${userId} in silo ${businessId}:`, error);
        return 'Unassigned';
    }
}

/**
 * Get all available entities from a specific business silo.
 * 
 * @param businessId - The business silo ID
 * @returns Array of entity information
 */
export async function getAllEntities(businessId: string): Promise<EntityInfo[]> {
    try {
        const entitiesSnapshot = await db.collection('businesses').doc(businessId)
                                         .collection('entities').get();
        const entities: EntityInfo[] = [];

        entitiesSnapshot.forEach((doc) => {
            entities.push({
                id: doc.id,
                ...(doc.data() as Omit<EntityInfo, 'id'>)
            });
        });

        return entities;
    } catch (error) {
        console.error(`Error fetching entities for business ${businessId}:`, error);
        return [];
    }
}

/**
 * Assign an entity to a user within a business silo.
 * 
 * @param userId - The user's Firebase Auth UID
 * @param businessId - The business silo ID
 * @param entityId - The entity ID to assign
 * @returns Success status
 */
export async function assignEntityToUser(userId: string, businessId: string, entityId: string): Promise<boolean> {
    try {
        // Create/update entity assignment document in business silo
        await db.collection('businesses').doc(businessId)
                .collection('entity_assignments').doc(userId).set({
            entityId: entityId,
            assignedAt: new Date().toISOString()
        }, { merge: true });

        return true;
    } catch (error) {
        console.error(`Error assigning entity to user ${userId} in silo ${businessId}:`, error);
        return false;
    }
}

