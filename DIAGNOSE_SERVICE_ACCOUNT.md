# Diagnose Service Account Identity Issue

## Current Implementation

The code in `sheet-operations.ts` uses **explicit credentials** from the environment variable:

```typescript
const serviceAccountKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
const credentials = JSON.parse(serviceAccountKey);
const auth = new google.auth.GoogleAuth({
    credentials: credentials,  // Explicit, not ADC
    scopes: [...]
});
```

This should work, but we need to verify:
1. The credentials are being loaded correctly
2. The service account email matches what we granted permissions to
3. The APIs are enabled for that service account

## Diagnostic Steps

### Step 1: Verify Service Account Email

Check what service account is in your credentials:

```powershell
# In functions directory
node -e "console.log(JSON.parse(require('fs').readFileSync('.env', 'utf8').match(/GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY='(.+?)'/)?.[1] || '{}')).client_email)"
```

Or manually check `functions/.env`:
- Look for `GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY`
- Extract the JSON and find `client_email`
- Should be: `financial-output@financialanaliyst.iam.gserviceaccount.com`

### Step 2: Add Logging to Verify Identity

We should add logging to see which service account is actually being used when creating sheets.

### Step 3: Check Cloud Logs

1. Go to: https://console.cloud.google.com/logs/query?project=financialanaliyst
2. Filter: `resource.type="cloud_function"` AND `textPayload=~"createNewGoogleSheet"`
3. Look for the error and check `principalEmail`

### Step 4: Verify APIs Are Enabled

1. Go to: https://console.cloud.google.com/apis/library?project=financialanaliyst
2. Verify both are enabled:
   - Google Sheets API
   - Google Drive API

### Step 5: Grant Permissions to Default Compute SA (If Needed)

If logs show it's using the default Compute Engine SA:

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=financialanaliyst
2. Find: `622000096460-compute@developer.gserviceaccount.com` (or similar)
3. Grant **Editor** role

## Alternative: Use Secret Manager (More Secure)

Instead of env var, use Google Secret Manager:

1. Create secret in Secret Manager
2. Reference in function definition
3. Load in code

This is more secure and reliable for production.

