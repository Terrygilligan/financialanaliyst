# Vertex AI Gemini 404 Error - Complete Troubleshooting Guide

## Overview

This document details the complete troubleshooting process for resolving a persistent **404 Not Found** error when attempting to use Gemini models via Vertex AI in Firebase Cloud Functions. The error occurred after migrating from API key-based authentication to service account-based authentication.

## Error Details

### Initial Error Message

```
[VertexAI.ClientError]: got status: 404 Not Found. 
{
  "error": {
    "code": 404,
    "message": "Publisher Model `projects/financialanaliyst/locations/us-central1/publishers/google/models/gemini-1.5-flash` was not found or your project does not have access to it. Please ensure you are using a valid model version.",
    "status": "NOT_FOUND"
  }
}
```

### Context

- **Project**: `financialanaliyst`
- **Location**: `us-central1`
- **Original Model**: `gemini-1.5-flash`
- **Authentication Method**: Service Account (Application Default Credentials)
- **SDK**: `@google-cloud/vertexai` v1.9.0

---

## Root Causes Identified

### 1. **Model Retirement (Primary Cause)**
- **Issue**: Gemini 1.5 Flash was retired in late 2025
- **Impact**: The model is no longer accessible, even in existing setups
- **Solution**: Upgrade to Gemini 2.5 Flash or newer

### 2. **Compromised API Key**
- **Issue**: Original Gemini API key was reported as leaked
- **Impact**: API calls were rejected with 403 Forbidden errors
- **Solution**: Migrated to service account authentication (no API key needed)

### 3. **Firebase Web API Key Compromise**
- **Issue**: Firebase browser API key was compromised
- **Impact**: Security risk, potential unauthorized access
- **Solution**: Regenerated new Firebase Web API key and updated configuration

---

## Complete Troubleshooting Steps

### Step 1: Initial Migration to Service Account Auth

**Problem**: Original implementation used `@google/generative-ai` SDK with API key authentication, which was compromised.

**Solution**: Migrated to `@google-cloud/vertexai` SDK with service account authentication.

**Changes Made**:
- Updated `functions/package.json`:
  ```json
  {
    "@google-cloud/vertexai": "^1.9.0"  // Added
    // Removed: "@google/generative-ai": "^0.21.0"
  }
  ```

- Updated `functions/src/gemini.ts`:
  ```typescript
  // Before: Using GoogleGenerativeAI with API key
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // After: Using VertexAI with service account
  const vertex = new VertexAI({
    project: PROJECT_ID,
    location: LOCATION,
  });
  const generativeModel = vertex.getGenerativeModel({ model: MODEL_NAME });
  ```

### Step 2: IAM Permissions Configuration

**Problem**: Service account lacked permissions to access Vertex AI models.

**Solution**: Granted `Vertex AI User` role to the Cloud Functions service account.

**Steps**:
1. Navigate to **IAM & Admin** → **IAM** in Google Cloud Console
2. Find the service account: `622000096460-compute@developer.gserviceaccount.com` (Default compute service account)
3. Click **Edit** (pencil icon)
4. Click **Add Another Role**
5. Select **Vertex AI User** (`roles/aiplatform.user`)
6. Click **Save**

**Verification**: Confirm the role appears in the IAM permissions list.

### Step 3: Model Name Format Attempts

**Problem**: Initial attempts used various model identifier formats, all resulting in 404 errors.

**Attempts Made**:
1. `gemini-1.5-flash-001` (with version suffix)
2. `publishers/google/models/gemini-1.5-flash-001` (full path)
3. `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/gemini-1.5-flash-001` (full resource path)
4. `gemini-1.5-flash` (without version suffix)

**Result**: All attempts failed with 404 errors, indicating the model itself was unavailable.

### Step 4: Region Testing

**Problem**: Suspected regional availability issues.

**Attempts Made**:
- Changed location from `us-central1` to `us-east1`
- Tested with different regions

**Result**: No improvement - confirmed the issue was not regional.

### Step 5: API Enablement Verification

**Problem**: Suspected missing API enablement.

**APIs Verified**:
- ✅ **Vertex AI API** (`aiplatform.googleapis.com`) - Enabled
- ✅ **Gemini API** (`generativelanguage.googleapis.com`) - Enabled
- ✅ **Generative Language API** - Enabled

**Result**: All required APIs were enabled, ruling out this as the cause.

### Step 6: Model Retirement Discovery

**Problem**: Gemini 1.5 Flash was retired in late 2025.

**Solution**: Updated to Gemini 2.5 Flash.

**Final Code Change**:
```typescript
// functions/src/gemini.ts
const MODEL_NAME = "gemini-2.5-flash";  // Changed from "gemini-1.5-flash"
```

---

## Key Rotation Process

### Firebase Web API Key Rotation

**Reason**: Original key (`AIzaSyByYX0MNyDpIueGboEnO5nk6xQdYQg3GcY`) was compromised.

**Steps**:

1. **Generate New Key**:
   - Navigate to **APIs & Services** → **Credentials** in Google Cloud Console
   - Find the "Browser key (auto created by Firebase)"
   - Click **Regenerate** or create a new browser key
   - Copy the new key value

2. **Update Configuration**:
   - Edit `public/firebase-config.js`:
     ```javascript
     export const firebaseConfig = {
         apiKey: "NEW_KEY_HERE",  // Updated key
         // ... other config
     };
     ```

3. **Deploy Updated Configuration**:
   ```bash
   firebase deploy --only hosting --project financialanaliyst
   ```

4. **Secure the New Key**:
   - In Google Cloud Console → **Credentials**
   - Click on the new browser key
   - Under **Application restrictions**, select **HTTP referrers (web sites)**
   - Add your domain: `https://financialanaliyst.web.app/*`
   - Click **Save**

5. **Delete Old Key**:
   - In **Credentials** page
   - Find the old compromised key
   - Click **Delete** (or disable first, then delete after confirming new key works)

### Gemini API Key Cleanup

**Reason**: No longer needed after migrating to service account authentication.

**Steps**:
1. Navigate to **Google AI Studio** or **APIs & Services** → **Credentials**
2. Find the Gemini API key that was flagged as leaked
3. Click **Disable** or **Delete**
4. Confirm deletion

**Note**: After migrating to Vertex AI with service account auth, API keys are no longer required for backend functions.

---

## Final Working Configuration

### Dependencies (`functions/package.json`)

```json
{
  "dependencies": {
    "@google-cloud/vertexai": "^1.9.0",
    "firebase-admin": "^12.5.0",
    "firebase-functions": "^5.1.1",
    "googleapis": "^128.0.0",
    "dotenv": "^16.3.1"
  }
}
```

### Vertex AI Configuration (`functions/src/gemini.ts`)

```typescript
import { VertexAI } from "@google-cloud/vertexai";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const MODEL_NAME = "gemini-2.5-flash";  // ✅ Current working model

function getGenerativeModel() {
    if (!PROJECT_ID) {
        throw new Error("GOOGLE_CLOUD_PROJECT is not set; required for Vertex AI.");
    }

    const vertex = new VertexAI({
        project: PROJECT_ID,
        location: LOCATION,
    });

    return vertex.getGenerativeModel({ model: MODEL_NAME });
}
```

### Environment Variables

**Required** (automatically set by Firebase Functions):
- `GOOGLE_CLOUD_PROJECT` - Set automatically to your project ID
- `GCLOUD_PROJECT` - Alternative name (also set automatically)

**Optional**:
- `VERTEX_LOCATION` - Defaults to `us-central1` if not set

### IAM Roles Required

**Service Account**: `{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`

**Required Role**: `roles/aiplatform.user` (Vertex AI User)

---

## Deployment Commands

### Build Functions
```bash
cd functions
npm install
npm run build
```

### Deploy Functions
```bash
firebase deploy --only functions --project financialanaliyst
```

### Deploy Hosting (after key rotation)
```bash
firebase deploy --only hosting --project financialanaliyst
```

### View Logs
```bash
firebase functions:log --project financialanaliyst --only analyzeReceiptUpload
```

---

## Verification Checklist

After implementing all fixes, verify:

- [ ] **Model Name**: Using `gemini-2.5-flash` (not 1.5)
- [ ] **IAM Permissions**: Service account has `Vertex AI User` role
- [ ] **APIs Enabled**: Vertex AI API and Gemini API are enabled
- [ ] **Authentication**: Using service account (no API keys in code)
- [ ] **Firebase Key**: New API key is in `firebase-config.js` and deployed
- [ ] **Old Keys**: Compromised keys are disabled/deleted
- [ ] **Region**: Using `us-central1` (standard region)
- [ ] **SDK Version**: Using `@google-cloud/vertexai` v1.9.0+

---

## Common Issues and Solutions

### Issue: "Model parameter must be either a Model Garden model ID or a full resource name"

**Cause**: SDK version incompatibility or incorrect model format.

**Solution**: 
- Use simple model name: `gemini-2.5-flash`
- Let the SDK construct the full resource path automatically
- Ensure SDK version is up to date

### Issue: "403 Forbidden - API key was reported as leaked"

**Cause**: Using compromised API key.

**Solution**:
- Migrate to service account authentication
- Remove API key from code
- Delete/disable compromised key

### Issue: "404 Not Found" persists after all fixes

**Possible Causes**:
1. Model name is incorrect (check latest available models)
2. Model is not available in your region
3. Project doesn't have access to the model (check quotas/billing)
4. API not fully enabled (wait a few minutes after enabling)

**Solution**: Check function logs for detailed error messages:
```bash
firebase functions:log --project financialanaliyst --only analyzeReceiptUpload
```

---

## Best Practices

### Security
1. **Never commit API keys** to version control
2. **Use service accounts** for backend functions (not API keys)
3. **Restrict Firebase API keys** by HTTP referrer
4. **Rotate keys immediately** if compromised
5. **Use environment variables** for sensitive configuration

### Model Selection
1. **Use latest stable models** (e.g., `gemini-2.5-flash` instead of `gemini-1.5-flash`)
2. **Check model availability** before deployment
3. **Monitor Google Cloud announcements** for model deprecations
4. **Test model upgrades** in staging before production

### Error Handling
1. **Log detailed configuration** for debugging:
   ```typescript
   console.log("Vertex AI Config:", {
       project: PROJECT_ID,
       location: LOCATION,
       model: MODEL_NAME
   });
   ```
2. **Check function logs** immediately after errors
3. **Verify IAM permissions** if access is denied
4. **Test with simple requests** before complex operations

---

## References

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Gemini Model Versions](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions)
- [Vertex AI SDK for Node.js](https://github.com/googleapis/nodejs-vertexai)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [IAM Roles for Vertex AI](https://cloud.google.com/vertex-ai/docs/general/access-control)

---

## Summary

**Final Solution**: The 404 error was caused by using the retired `gemini-1.5-flash` model. Updating to `gemini-2.5-flash` resolved the issue.

**Key Takeaways**:
1. Always use the latest stable model versions
2. Monitor Google Cloud announcements for model deprecations
3. Use service account authentication for backend functions
4. Rotate compromised keys immediately
5. Verify IAM permissions and API enablement

**Date Resolved**: December 15, 2025  
**Model Used**: `gemini-2.5-flash`  
**Authentication**: Service Account (Application Default Credentials)  
**Status**: ✅ Resolved

---

## Additional Issue: Mobile Upload Problems

### Problem
After resolving the Vertex AI 404 error, mobile users could login but were unable to upload receipt images. The upload would either fail silently or get stuck at 0% progress.

### Root Cause
The service worker was interfering with Firebase Storage uploads by attempting to cache or intercept POST requests to `firebasestorage.app` domain.

### Solution
Updated the service worker to explicitly bypass all Firebase Storage requests:

```javascript
// Bypass caching for all Firebase/Google APIs and non-GET requests (uploads)
if (
  !request ||
  request.method !== 'GET' ||
  url.includes('firestore.googleapis.com') ||
  url.includes('firebasestorage.app') ||  // Added for uploads
  url.includes('firebaseio.com') ||
  url.includes('googleapis.com') ||
  url.includes('firebaseapp.com')        // Added for Firebase domains
) {
  return; // let the network handle it (no service worker interference)
}
```

### Additional Fixes
- Updated service worker cache version to `v3` to force refresh after key rotation
- Configured `firebase-config.js` to always fetch fresh (never cache) to ensure latest API key
- Ensured all non-GET requests (POST, PUT for uploads) bypass service worker

### Verification
- ✅ Mobile login works (after API key rotation and cache clear)
- ✅ Mobile upload works (after service worker update)
- ✅ Web upload works
- ✅ Receipt processing works end-to-end

**Date Resolved**: December 15, 2025  
**Status**: ✅ Fully Operational
