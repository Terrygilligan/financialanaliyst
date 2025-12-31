// functions/src/user.ts

import { onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

const auth = getAuth();
const db = getFirestore();

export const createUser = onCall(async (request) => {
    const { email, password, businessName } = request.data;

    // 1. Basic validation
    if (!email || !password || !businessName) {
        throw new Error("Missing required fields: email, password, businessName");
    }

    // For simplicity, we'll generate a businessId from the name.
    // In a real app, you might want a more robust way to generate a unique ID.
    const businessId = businessName.toLowerCase().replace(/\s+/g, '-');

    try {
        // 2. Create the user
        const userRecord = await auth.createUser({
            email,
            password,
        });

        // 3. Set custom claims
        await auth.setCustomUserClaims(userRecord.uid, { businessId });

        // 4. Create the user lookup document
        await db.collection("user_lookup").doc(email).set({
            businessId,
        });

        // 5. Create a user profile document within the business's collection
        await db.collection(`businesses/${businessId}/users`).doc(userRecord.uid).set({
            email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
            success: true,
            uid: userRecord.uid,
            businessId,
        };
    } catch (error) {
        console.error("Error creating user:", error);
        throw new Error("User creation failed.");
    }
});

export const sendPasswordReset = onCall(async (request) => {
    const { email } = request.data;

    if (!email) {
        throw new Error("Missing required field: email");
    }

    try {
        const userLookupSnap = await db.collection("user_lookup").doc(email).get();

        if (userLookupSnap.exists()) {
            const businessId = userLookupSnap.data()?.businessId;
            const link = await auth.generatePasswordResetLink(email);
            // In a real application, you would email the user this link.
            // For now, we'll log it to the console for verification.
            console.log(`Password reset link for ${email} (Business ID: ${businessId}): ${link}`);
        }
    } catch (error) {
        // We catch the error, but don't rethrow it to prevent email enumeration.
        console.error("Error in sendPasswordReset:", error);
    }

    // Always return a success message to the client.
    return { success: true, message: "If an account exists for this email, a password reset link has been sent." };
});
