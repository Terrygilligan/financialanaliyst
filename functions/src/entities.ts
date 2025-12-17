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
 * Lookup entity for a user based on their user ID.
 * 
 * This function checks if the user has an assigned entity in Firestore.
 * If no entity is found, returns 'Unassigned'.
 * 
 * @param userId - The user's Firebase Auth UID
 * @returns The entity name (or 'Unassigned' if not found)
 */
export async function lookupEntityForUser(userId: string): Promise<string> {
    try {
        // Check if user has an entity assignment in /users/{userId}
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.entity) {
                // Check if entity is an ID (look it up in /entities collection)
                // This handles the case where assignEntityToUser stores entityId
                const entityDoc = await db.collection('entities').doc(userData.entity).get();
                if (entityDoc.exists) {
                    const entityData = entityDoc.data() as EntityInfo;
                    return entityData.name || 'Unassigned';
                }
                // If not found in entities collection, assume it's already a name
                // (for backward compatibility with any existing data)
                return userData.entity;
            }
        }

        // Check if there's a dedicated entity assignment document
        const entityAssignmentDoc = await db.collection('entity_assignments').doc(userId).get();
        
        if (entityAssignmentDoc.exists) {
            const assignmentData = entityAssignmentDoc.data();
            if (assignmentData?.entityId) {
                // Look up the entity name from /entities collection
                const entityDoc = await db.collection('entities').doc(assignmentData.entityId).get();
                if (entityDoc.exists) {
                    const entityData = entityDoc.data() as EntityInfo;
                    return entityData.name || 'Unassigned';
                }
            }
        }

        // Default to 'Unassigned' if no entity found
        return 'Unassigned';
    } catch (error) {
        console.error(`Error looking up entity for user ${userId}:`, error);
        // Return default on error
        return 'Unassigned';
    }
}

/**
 * Get all available entities from Firestore.
 * 
 * @returns Array of entity information
 */
export async function getAllEntities(): Promise<EntityInfo[]> {
    try {
        const entitiesSnapshot = await db.collection('entities').get();
        const entities: EntityInfo[] = [];

        entitiesSnapshot.forEach((doc) => {
            entities.push({
                id: doc.id,
                ...(doc.data() as Omit<EntityInfo, 'id'>)
            });
        });

        return entities;
    } catch (error) {
        console.error('Error fetching entities:', error);
        return [];
    }
}

/**
 * Assign an entity to a user.
 * 
 * @param userId - The user's Firebase Auth UID
 * @param entityId - The entity ID to assign
 * @returns Success status
 */
export async function assignEntityToUser(userId: string, entityId: string): Promise<boolean> {
    try {
        // Update user document
        await db.collection('users').doc(userId).set({
            entity: entityId,
            entityAssignedAt: new Date().toISOString()
        }, { merge: true });

        // Also create/update entity assignment document
        await db.collection('entity_assignments').doc(userId).set({
            entityId: entityId,
            assignedAt: new Date().toISOString()
        }, { merge: true });

        return true;
    } catch (error) {
        console.error(`Error assigning entity to user ${userId}:`, error);
        return false;
    }
}

