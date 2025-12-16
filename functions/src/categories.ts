// functions/src/categories.ts

import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const db = getFirestore();
const auth = getAuth();

/**
 * Category information structure
 */
export interface CategoryInfo {
    id: string;
    name: string;
    description?: string;
    createdAt?: string;
    createdBy?: string;
    isDefault?: boolean;
}

/**
 * Get all categories from Firestore.
 * Falls back to default categories if none exist.
 * 
 * @returns Array of category information
 */
export async function getAllCategories(): Promise<CategoryInfo[]> {
    try {
        const categoriesSnapshot = await db.collection('categories').orderBy('name').get();
        
        if (categoriesSnapshot.empty) {
            // Return default categories if none exist
            return getDefaultCategories();
        }

        const categories: CategoryInfo[] = [];
        categoriesSnapshot.forEach((doc) => {
            categories.push({
                id: doc.id,
                ...(doc.data() as Omit<CategoryInfo, 'id'>)
            });
        });

        return categories;
    } catch (error) {
        console.error('Error fetching categories:', error);
        // Fall back to default categories on error
        return getDefaultCategories();
    }
}

/**
 * Get default categories (matching the Category enum)
 */
function getDefaultCategories(): CategoryInfo[] {
    return [
        { id: 'maintenance', name: 'Maintenance', isDefault: true },
        { id: 'cleaning_supplies', name: 'Cleaning Supplies', isDefault: true },
        { id: 'utilities', name: 'Utilities', isDefault: true },
        { id: 'supplies', name: 'Supplies', isDefault: true },
        { id: 'other', name: 'Other', isDefault: true }
    ];
}

/**
 * Cloud Function: Get All Categories
 * 
 * Returns all available categories from Firestore, with fallback to defaults.
 */
export const getCategories = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        try {
            const categories = await getAllCategories();
            return {
                success: true,
                categories: categories
            };
        } catch (error) {
            console.error('Error in getCategories:', error);
            throw new Error(`Failed to fetch categories: ${(error as Error).message}`);
        }
    }
);

/**
 * Cloud Function: Create Category
 * 
 * Creates a new category. Admin only.
 */
export const createCategory = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        // Verify caller is authenticated and is admin
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new Error("Unauthorized: Authentication required");
        }

        try {
            const caller = await auth.getUser(callerUid);
            if (!caller.customClaims?.admin) {
                throw new Error("Unauthorized: Admin privileges required");
            }
        } catch (error) {
            if (error instanceof Error && error.message === "Unauthorized: Admin privileges required") {
                throw error;
            }
            console.error("Error verifying admin status:", error);
            throw new Error(`Failed to verify admin status: ${(error as Error).message}`);
        }

        const { name, description } = request.data || {};

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error("Category name is required");
        }

        try {
            // Check if category with same name already exists
            const existingCategories = await getAllCategories();
            const nameLower = name.trim().toLowerCase();
            if (existingCategories.some(cat => cat.name.toLowerCase() === nameLower)) {
                throw new Error("Category with this name already exists");
            }

            // Create new category
            const categoryRef = db.collection('categories').doc();
            await categoryRef.set({
                name: name.trim(),
                description: description?.trim() || '',
                createdAt: new Date().toISOString(),
                createdBy: callerUid,
                isDefault: false
            });

            return {
                success: true,
                category: {
                    id: categoryRef.id,
                    name: name.trim(),
                    description: description?.trim() || '',
                    createdAt: new Date().toISOString(),
                    createdBy: callerUid,
                    isDefault: false
                }
            };
        } catch (error) {
            console.error('Error creating category:', error);
            throw new Error(`Failed to create category: ${(error as Error).message}`);
        }
    }
);

/**
 * Cloud Function: Update Category
 * 
 * Updates an existing category. Admin only.
 */
export const updateCategory = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        // Verify caller is authenticated and is admin
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new Error("Unauthorized: Authentication required");
        }

        try {
            const caller = await auth.getUser(callerUid);
            if (!caller.customClaims?.admin) {
                throw new Error("Unauthorized: Admin privileges required");
            }
        } catch (error) {
            if (error instanceof Error && error.message === "Unauthorized: Admin privileges required") {
                throw error;
            }
            console.error("Error verifying admin status:", error);
            throw new Error(`Failed to verify admin status: ${(error as Error).message}`);
        }

        const { categoryId, name, description } = request.data || {};

        if (!categoryId) {
            throw new Error("Category ID is required");
        }

        if (name && (typeof name !== 'string' || name.trim().length === 0)) {
            throw new Error("Category name must be a non-empty string");
        }

        try {
            const categoryRef = db.collection('categories').doc(categoryId);
            const categoryDoc = await categoryRef.get();

            if (!categoryDoc.exists) {
                throw new Error("Category not found");
            }

            const updateData: Partial<CategoryInfo> = {};
            if (name) {
                // Check if new name conflicts with existing category
                const existingCategories = await getAllCategories();
                const nameLower = name.trim().toLowerCase();
                if (existingCategories.some(cat => cat.id !== categoryId && cat.name.toLowerCase() === nameLower)) {
                    throw new Error("Category with this name already exists");
                }
                updateData.name = name.trim();
            }
            if (description !== undefined) {
                updateData.description = description?.trim() || '';
            }

            await categoryRef.update(updateData);

            return {
                success: true,
                message: "Category updated successfully"
            };
        } catch (error) {
            console.error('Error updating category:', error);
            throw new Error(`Failed to update category: ${(error as Error).message}`);
        }
    }
);

/**
 * Cloud Function: Delete Category
 * 
 * Deletes a category. Admin only. Cannot delete default categories.
 */
export const deleteCategory = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        // Verify caller is authenticated and is admin
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new Error("Unauthorized: Authentication required");
        }

        try {
            const caller = await auth.getUser(callerUid);
            if (!caller.customClaims?.admin) {
                throw new Error("Unauthorized: Admin privileges required");
            }
        } catch (error) {
            if (error instanceof Error && error.message === "Unauthorized: Admin privileges required") {
                throw error;
            }
            console.error("Error verifying admin status:", error);
            throw new Error(`Failed to verify admin status: ${(error as Error).message}`);
        }

        const { categoryId } = request.data || {};

        if (!categoryId) {
            throw new Error("Category ID is required");
        }

        try {
            const categoryRef = db.collection('categories').doc(categoryId);
            const categoryDoc = await categoryRef.get();

            if (!categoryDoc.exists) {
                throw new Error("Category not found");
            }

            const categoryData = categoryDoc.data() as CategoryInfo;
            if (categoryData.isDefault) {
                throw new Error("Cannot delete default categories");
            }

            await categoryRef.delete();

            return {
                success: true,
                message: "Category deleted successfully"
            };
        } catch (error) {
            console.error('Error deleting category:', error);
            throw new Error(`Failed to delete category: ${(error as Error).message}`);
        }
    }
);

