# How to Get Google OAuth Client ID

## The Problem
The OAuth token from Firebase Auth (`credentialFromResult`) is not the actual Google OAuth access token needed for Drive API calls. We need to use Google Identity Services to get the real token, which requires the OAuth client ID.

## Solution: Get OAuth Client ID from Firebase/Google Cloud

### Method 1: Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `<YOUR_PROJECT_ID>`
3. Go to **Project Settings** (gear icon)
4. Scroll to **Your apps** section
5. Find your **Web app** configuration
6. Look for **OAuth client ID** or **Web client ID**

### Method 2: Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: `<YOUR_PROJECT_ID>`
3. Go to **APIs & Services** > **Credentials**
4. Find **OAuth 2.0 Client IDs**
5. Look for the **Web client** (usually named like "Web client (auto created by Google Service)")
6. Copy the **Client ID** (format: `XXXXX.apps.googleusercontent.com`)

## Update Code
Once you have the OAuth client ID, add it to `firebase-config.js`:

```javascript
export const firebaseConfig = {
    // ... existing config ...
    oauthClientId: "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com"
};
```

Then update `business-signup.js` to use it:

```javascript
const { firebaseConfig } = await import('./firebase-config.js');
const oauthClientId = firebaseConfig.oauthClientId || 
                      `${firebaseConfig.projectId}.apps.googleusercontent.com`;
```

---

**Status**: Need to get OAuth client ID from Firebase/Google Cloud Console

