// functions/src/user.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const auth = getAuth();
const db = getFirestore();

/**
 * Cloud Function: Create a new user with business context.
 * This is used for self-service signup of new business admins.
 */
export const createUser = onCall({ region: "us-central1" }, async (request) => {
    const { email, password, businessName, displayName } = request.data;

    // 1. Basic validation
    if (!email || !password || !businessName) {
        throw new HttpsError("invalid-argument", "Missing required fields: email, password, businessName");
    }

    // Generate a businessId from the name (or use a random one for better security)
    const businessId = `business-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    try {
        // 2. Create the user within the specific Auth Tenant (Identity Platform)
        // This ensures the user exists ONLY within this business silo.
        const tenantAuth = auth.tenantManager().authForTenant(businessId);
        
        const userRecord = await tenantAuth.createUser({
            email,
            password,
            displayName: displayName || businessName,
            emailVerified: false
        });

        // 3. Set custom claims for the admin within the tenant context
        await tenantAuth.setCustomUserClaims(userRecord.uid, { 
            businessId,
            admin: true,
            role: 'admin'
        });

        // 4. Create the user lookup document for tenant-aware login/recovery
        await db.collection("user_lookup").doc(email.toLowerCase()).set({
            businessId,
            uid: userRecord.uid,
            createdAt: FieldValue.serverTimestamp()
        });

        // 5. Initialize the business silo document
        await db.collection("businesses").doc(businessId).set({
            name: businessName,
            ownerUid: userRecord.uid,
            createdAt: FieldValue.serverTimestamp(),
            status: 'active'
        });

        // 6. Create a user profile document within the business's silo
        await db.collection("users").doc(userRecord.uid).set({
            email,
            displayName: displayName || businessName,
            businessId,
            role: 'admin',
            createdAt: FieldValue.serverTimestamp()
        });

        return {
            success: true,
            uid: userRecord.uid,
            businessId,
        };
    } catch (error: any) {
        console.error("Error creating user:", error);
        if (error.code === 'auth/email-already-exists') {
            throw new HttpsError("already-exists", "The email address is already in use.");
        }
        throw new HttpsError("internal", "User creation failed: " + error.message);
    }
});

/**
 * Cloud Function: Server-side password reset trigger.
 * Note: We usually prefer client-side reset for UI flexibility, 
 * but this is useful for backend-triggered resets.
 */
export const sendPasswordReset = onCall({ region: "us-central1" }, async (request) => {
    const { email } = request.data;

    if (!email) {
        throw new HttpsError("invalid-argument", "Missing required field: email");
    }

    try {
        const userLookupSnap = await db.collection("user_lookup").doc(email.toLowerCase()).get();

        if (userLookupSnap.exists) {
            const businessId = userLookupSnap.data()?.businessId;
            // For multi-tenant Identity Platform, we'd use the tenantManager
            const tenantAuth = auth.tenantManager().authForTenant(businessId);
            const link = await tenantAuth.generatePasswordResetLink(email);
            
            // In a real app, you'd send this link via your email service (SendGrid, Mailgun, etc.)
            console.log(`[IDENTITY] Password reset link for ${email} (Tenant: ${businessId}): ${link}`);
            
            return { success: true, message: "Reset link generated and logged." };
        }
    } catch (error) {
        console.error("Error in sendPasswordReset:", error);
    }

    // Always return success to prevent email enumeration
    return { success: true, message: "If an account exists, a reset link has been processed." };
});

