# Troubleshooting: Google Sheet Not Updating

## 🔍 Issue Identified

The Google Sheet has correct headers but no data is being written. This is most likely because **environment variables from `.env` are not available in the deployed Firebase Function**.

## ⚠️ Critical Issue: Environment Variables in Production

**Firebase Functions 2nd Gen do NOT automatically load `.env` files in production!**

The `.env` file only works for:
- ✅ Local development/testing
- ❌ **NOT for deployed functions**

## 🔧 Solution: Set Environment Variables for Production

We need to set environment variables using one of these methods:

### Option 1: Firebase Functions Secrets (Recommended for 2nd Gen)

```bash
# Set secrets (one-time setup)
firebase functions:secrets:set GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY
firebase functions:secrets:set GOOGLE_SHEET_ID
firebase functions:secrets:set GEMINI_API_KEY
```

Then update `firebase.json` to use secrets.

### Option 2: Google Cloud Console (Quick Fix)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **Cloud Functions** → **analyzeReceiptUpload**
3. Click **Edit**
4. Go to **Runtime, build, connections and security settings**
5. Add environment variables:
   - `GOOGLE_SHEET_ID` = `1gc-R5cKCOVFnnC0EsVJ_OIDXP-PIQ_pWcssr-HJujos`
   - `GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY` = (paste the JSON string)
   - `GEMINI_API_KEY` = (your API key)

### Option 3: Update Code to Use Runtime Config (Alternative)

We can modify the code to read from Firebase Functions config instead of .env.

## 🚨 Immediate Action Required

**The function is deployed but can't access environment variables, so:**
- `process.env.GOOGLE_SHEET_ID` is `undefined` in production
- The Sheets write is being skipped (see line 93 in index.ts: "GOOGLE_SHEET_ID not set. Skipping Sheets write.")

## 📋 Quick Fix Steps

1. **Check current function logs** to confirm the issue
2. **Set environment variables** using one of the methods above
3. **Redeploy** the function
4. **Test** with a new receipt upload
