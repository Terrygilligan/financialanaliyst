# Vertex AI Setup Guide

## Switching from REST API to Vertex AI

We're switching to Vertex AI because:
- ✅ "Gemini for Google Cloud API" shows 0% errors (working)
- ❌ "Generative Language API" shows 100% errors (blocked)

## Step 1: Grant Permissions to Cloud Function Service Account

The Cloud Function needs permission to use Vertex AI.

### Find Your Function's Service Account

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **financialanaliyst**
3. Go to **Functions** → Click on `analyzeReceiptUpload`
4. Look for **Service account** - it will be something like:
   - `622000096460-compute@developer.gserviceaccount.com`
   - Or `financialanaliyst@appspot.gserviceaccount.com`

### Grant Vertex AI User Role

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: **financialanaliyst**
3. Go to **IAM & Admin** → **IAM**
4. Find the service account (from above)
5. Click the **pencil icon** (Edit) next to it
6. Click **+ ADD ANOTHER ROLE**
7. Select: **Vertex AI User**
8. Click **Save**

**OR** use this direct link:
👉 [Grant Vertex AI User Role](https://console.cloud.google.com/iam-admin/iam?project=financialanaliyst)

## Step 2: Enable Vertex AI API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** → **Library**
3. Search for **"Vertex AI API"**
4. Click **Enable**

**OR** use this direct link:
👉 [Enable Vertex AI API](https://console.developers.google.com/apis/api/aiplatform.googleapis.com/overview?project=622000096460)

## Step 3: Install Dependencies & Deploy

The code has been updated. Now:

1. **Install the new package**:
   ```bash
   cd functions
   npm install
   ```

2. **Build**:
   ```bash
   npm run build
   ```

3. **Deploy**:
   ```bash
   firebase deploy --only functions --project financialanaliyst
   ```

## What Changed

### Code Updates:
- ✅ Replaced `@google/generative-ai` with `@google-cloud/aiplatform`
- ✅ Updated to use Vertex AI SDK
- ✅ Uses Service Account authentication (no API key needed)
- ✅ Uses `gemini-1.5-flash-001` model via Vertex AI

### Benefits:
- ✅ No API key restrictions to worry about
- ✅ More secure (Service Account based)
- ✅ Better for production
- ✅ Uses the working "Gemini for Google Cloud API"

## After Setup

1. Wait 1-2 minutes for permissions to propagate
2. Upload a receipt to test
3. Check function logs if needed

---

**Status**: Code updated, awaiting permissions and deployment
