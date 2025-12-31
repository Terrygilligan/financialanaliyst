// functions/src/get-google-oauth-token.ts
// Helper to get Google OAuth access token from Firebase Auth user

import { getAuth } from "firebase-admin/auth";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Get Google OAuth access token from Firebase Auth user
 * This requires the user to have signed in with Google
 */
export async function getGoogleOAuthToken(uid: string): Promise<string | null> {
  try {
    const auth = getAuth();
    const user = await auth.getUser(uid);
    
    // Check if user signed in with Google
    const googleProvider = user.providerData.find(
      (provider) => provider.providerId === 'google.com'
    );
    
    if (!googleProvider) {
      console.log(`[OAuth Token] User ${uid} did not sign in with Google`);
      return null;
    }
    
    // Firebase Admin SDK doesn't directly provide OAuth tokens
    // We need to use a different approach - either:
    // 1. Request token from client-side when user signs in
    // 2. Use Firebase Auth REST API to exchange ID token for OAuth token
    // 3. Have user explicitly grant Drive access
    
    // For now, return null - client should request token directly
    return null;
  } catch (error: any) {
    console.error('[OAuth Token] Error getting token:', error);
    throw new HttpsError('internal', `Failed to get OAuth token: ${error.message}`);
  }
}


