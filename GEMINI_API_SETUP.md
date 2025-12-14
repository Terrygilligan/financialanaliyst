# Gemini API (Generative Language API) Setup

## Error Message
```
Generative Language API has not been used in project 622000096460 before or it is disabled.
```

## Quick Fix

### Option 1: Direct Link (Easiest)
Click this link to enable the Generative Language API:
👉 **[Enable Generative Language API](https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=622000096460)**

Then click **"Enable"** button.

### Option 2: Manual Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: **financialanaliyst** (or project number: 622000096460)
3. Navigate to **APIs & Services** → **Library**
4. Search for **"Generative Language API"**
5. Click on it and click **"Enable"**

### Option 3: Via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **financialanaliyst**
3. Go to **Project Settings** (gear icon)
4. Click **"APIs"** tab or go to **Google Cloud Console** link
5. Search for **"Generative Language API"**
6. Click **"Enable"**

## After Enabling

1. **Wait 1-2 minutes** for the API to propagate
2. The Cloud Function will automatically retry on the next upload
3. Or you can manually trigger by uploading a new receipt

## Verify API is Enabled

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** → **Enabled APIs & Services**
3. Look for **"Generative Language API"** in the list
4. Status should show as **"Enabled"**

## Alternative: Vertex AI API

If you prefer to use Vertex AI instead of the REST API:

1. Enable **Vertex AI API** instead
2. Update the code to use Vertex AI SDK
3. This requires different authentication (Service Account)

For now, enabling **Generative Language API** is the quickest solution.

---

**Status**: API needs to be enabled in Google Cloud Console
