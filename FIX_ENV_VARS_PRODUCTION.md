# Fix: Set Environment Variables for Production

## 🚨 Problem

The Google Sheet isn't updating because **environment variables are not available in the deployed function**. The `.env` file only works locally, not in production.

## ✅ Solution: Set Environment Variables in Google Cloud Console

### Method 1: Google Cloud Console (Easiest)

1. **Go to Cloud Functions**:
   - Visit: https://console.cloud.google.com/functions/list?project=financialanaliyst
   - Or: Google Cloud Console → Cloud Functions → analyzeReceiptUpload

2. **Edit the Function**:
   - Click on `analyzeReceiptUpload`
   - Click **EDIT** button (top right)

3. **Add Environment Variables**:
   - Scroll down to **Runtime, build, connections and security settings**
   - Expand **Runtime environment variables**
   - Click **ADD VARIABLE** for each:

   **Variable 1:**
   - Name: `GOOGLE_SHEET_ID`
   - Value: `1gc-R5cKCOVFnnC0EsVJ_OIDXP-PIQ_pWcssr-HJujos`

   **Variable 2:**
   - Name: `GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY`
   - Value: (paste the entire JSON string from your .env file - the one starting with `{"type":"service_account"...}`)

   **Variable 3:**
   - Name: `GEMINI_API_KEY`
   - Value: (your Gemini API key)

4. **Save and Deploy**:
   - Click **DEPLOY** or **NEXT** → **DEPLOY**
   - Wait for deployment to complete (~2-3 minutes)

### Method 2: Using gcloud CLI (Alternative)

```bash
# Set environment variables
gcloud functions deploy analyzeReceiptUpload \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --set-env-vars GOOGLE_SHEET_ID=1gc-R5cKCOVFnnC0EsVJ_OIDXP-PIQ_pWcssr-HJujos \
  --set-env-vars GEMINI_API_KEY=your-api-key-here \
  --set-env-vars GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

**Note**: For the Service Account key, you'll need to escape it properly or use a file.

## 🔍 Verify It's Working

After setting environment variables:

1. **Upload a test receipt** via the web app
2. **Check function logs**:
   ```bash
   firebase functions:log --project financialanaliyst
   ```
   Look for:
   - ✅ "Receipt data successfully written to Google Sheet"
   - ❌ "GOOGLE_SHEET_ID not set" (means it's still not working)

3. **Check Google Sheet** - new row should appear

4. **Check Firestore** - status document should have `sheetsWriteSuccess: true`

## 📝 Quick Reference

**Service Account Email**: `financial-output@financialanaliyst.iam.gserviceaccount.com`  
**Sheet ID**: `1gc-R5cKCOVFnnC0EsVJ_OIDXP-PIQ_pWcssr-HJujos`  
**Sheet URL**: https://docs.google.com/spreadsheets/d/1gc-R5cKCOVFnnC0EsVJ_OIDXP-PIQ_pWcssr-HJujos/edit

---

**After setting environment variables, the Sheet should start updating automatically!**
