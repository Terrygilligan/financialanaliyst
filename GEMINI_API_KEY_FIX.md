# Gemini API Key Blocked - Fix Guide

## Error Message
```
API_KEY_SERVICE_BLOCKED - Requests to this API are blocked
```

This means your API key has restrictions that are blocking the Generative Language API.

## Quick Fix Options

### Option 1: Check API Key Restrictions (Most Likely Issue)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: **financialanaliyst**
3. Navigate to **APIs & Services** → **Credentials**
4. Find your API key (the one starting with `AIzaSy...`)
5. Click on it to edit
6. Check **API restrictions** section:
   - If it says **"Restrict key"**, make sure **"Generative Language API"** is in the allowed list
   - OR change to **"Don't restrict key"** (for testing)
7. Click **Save**

### Option 2: Create a New API Key (If Current One is Too Restricted)

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **API key**
3. Copy the new API key
4. Update `functions/.env` file:
   ```
   GEMINI_API_KEY=your-new-api-key-here
   ```
5. Redeploy the function:
   ```bash
   firebase deploy --only functions --project financialanaliyst
   ```

### Option 3: Use Vertex AI Instead (More Secure for Production)

If API keys keep getting blocked, consider using Vertex AI with Service Account:

1. Create a Service Account for Vertex AI
2. Grant it "Vertex AI User" role
3. Update code to use Vertex AI SDK instead of REST API
4. No API key needed - uses Service Account authentication

## Current Setup

Your API key is stored in: `functions/.env` as `GEMINI_API_KEY`

The function reads it from environment variables when deployed.

## After Fixing

1. **Wait 1-2 minutes** for changes to propagate
2. **Redeploy function** (if you changed the API key):
   ```bash
   firebase deploy --only functions --project financialanaliyst
   ```
3. **Try uploading a receipt again**

## Verify API Key Works

You can test the API key directly:
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Try making a test API call
3. If it works there, the key is valid

---

**Status**: API key restrictions need to be updated
