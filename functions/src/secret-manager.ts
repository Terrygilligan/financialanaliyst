// functions/src/secret-manager.ts
// Helper functions for accessing Firebase Secret Manager
// Falls back to process.env for local development

import { defineSecret } from "firebase-functions/params";

/**
 * Define secrets (these are referenced in function definitions)
 * These secrets must be set via: firebase functions:secrets:set SECRET_NAME
 */
export const GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY = defineSecret("GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY");
export const GOOGLE_OAUTH_CLIENT_SECRET = defineSecret("GOOGLE_OAUTH_CLIENT_SECRET");
export const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

/**
 * Get a secret value, falling back to process.env for local development
 * 
 * @param secret - The secret parameter from defineSecret
 * @param envVarName - The environment variable name to fall back to
 * @returns The secret value
 */
export function getSecret(secret: ReturnType<typeof defineSecret>, envVarName: string): string {
    try {
        // In production, secret.value() returns the secret value
        // In local development, it may be undefined, so we fall back to process.env
        const secretValue = secret.value();
        if (secretValue) {
            return secretValue;
        }
    } catch (error) {
        // Secret not available, fall back to env var
        console.log(`[Secret Manager] Secret not available, using env var: ${envVarName}`);
    }
    
    // Fallback to process.env for local development
    const envValue = process.env[envVarName];
    if (!envValue) {
        throw new Error(
            `Secret ${envVarName} is not set. ` +
            `Set it via: firebase functions:secrets:set ${envVarName} ` +
            `or add it to .env file for local development.`
        );
    }
    
    return envValue;
}

/**
 * Get service account key from Secret Manager or env var
 */
export function getServiceAccountKey(): string {
    return getSecret(GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY, "GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY");
}

/**
 * Get OAuth client secret from Secret Manager or env var
 */
export function getOAuthClientSecret(): string | undefined {
    try {
        return getSecret(GOOGLE_OAUTH_CLIENT_SECRET, "GOOGLE_OAUTH_CLIENT_SECRET");
    } catch {
        // OAuth client secret is optional
        return undefined;
    }
}

/**
 * Get Gemini API key from Secret Manager or env var (if using direct API)
 * Note: Vertex AI uses service account, so this may not be needed
 */
export function getGeminiApiKey(): string | undefined {
    try {
        return getSecret(GEMINI_API_KEY, "GEMINI_API_KEY");
    } catch {
        // Gemini API key is optional (Vertex AI uses service account)
        return undefined;
    }
}

