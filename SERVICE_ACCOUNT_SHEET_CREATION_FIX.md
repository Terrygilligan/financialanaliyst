# Fix: Service Account Permission to Create Google Sheets

## Error
```
Failed to create Google Sheet: The caller does not have permission
```

## Root Cause
The service account needs proper permissions and APIs enabled to create Google Sheets programmatically.

---

## Solution Steps

### 1. Enable Required APIs

Go to [Google Cloud Console - APIs & Services](https://console.cloud.google.com/apis/library):

1. **Enable Google Sheets API**:
   - Search for "Google Sheets API"
   - Click "Enable"

2. **Enable Google Drive API**:
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Grant Service Account Permissions

Go to [IAM & Admin - Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts):

1. Find your service account: `financial-output@financialanaliyst.iam.gserviceaccount.com`
2. Click on it
3. Go to **"Permissions"** tab
4. Click **"Grant Access"** or **"Add Principal"**
5. Add these roles:
   - ✅ **Service Account User** (if not already present)
   - ✅ **Editor** (or **Owner** for full access)

### 3. Verify Service Account Key

Check that your service account key has:
- ✅ Valid JSON format
- ✅ All required fields: `type`, `project_id`, `private_key_id`, `private_key`, `client_email`, `client_id`, `auth_uri`, `token_uri`, `auth_provider_x509_cert_url`, `client_x509_cert_url`
- ✅ Correct `project_id`: `financialanaliyst`

### 4. Check Environment Variable

Verify the environment variable is set correctly:

**For Local Emulators:**
```bash
# Check if variable is set
echo $GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY

# Or in PowerShell:
$env:GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY
```

**For Production (Firebase Functions):**
```bash
# Check current config
firebase functions:config:get

# Should show:
# {
#   "google_sheets": {
#     "service_account_key": "{...JSON...}"
#   }
# }
```

### 5. Alternative: Use Domain-Wide Delegation (Advanced)

If you're in a Google Workspace domain:

1. Enable Domain-Wide Delegation in service account settings
2. Add scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/drive.file`

---

## Quick Test

After fixing permissions, test by:

1. **Using the Admin UI**:
   - Go to Sheet Management
   - Select "Create New Sheet"
   - Enter a name
   - Click "Save Configuration"

2. **Or via Cloud Function logs**:
   ```bash
   firebase functions:log --only createNewGoogleSheet
   ```

---

## Common Issues

### Issue: "API not enabled"
**Fix**: Enable Google Sheets API and Google Drive API in Cloud Console

### Issue: "Permission denied"
**Fix**: Grant Editor or Owner role to service account

### Issue: "Invalid credentials"
**Fix**: Regenerate service account key and update environment variable

### Issue: "Project not found"
**Fix**: Verify `project_id` in service account key matches Firebase project

---

## Verification Checklist

- [ ] Google Sheets API enabled
- [ ] Google Drive API enabled
- [ ] Service account has Editor/Owner role
- [ ] Service account key is valid JSON
- [ ] Environment variable is set correctly
- [ ] Project ID matches in key and Firebase project

---

## Still Not Working?

1. **Check Cloud Function logs**:
   ```bash
   firebase functions:log
   ```

2. **Verify service account email**:
   - Should be: `financial-output@financialanaliyst.iam.gserviceaccount.com`
   - Check in Cloud Console → IAM & Admin → Service Accounts

3. **Test with a simple script**:
   ```javascript
   const { google } = require('googleapis');
   const auth = new google.auth.GoogleAuth({
     credentials: JSON.parse(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY),
     scopes: [
       'https://www.googleapis.com/auth/spreadsheets',
       'https://www.googleapis.com/auth/drive'
     ]
   });
   const sheets = google.sheets({ version: 'v4', auth });
   // Try to create a sheet...
   ```

---

**After fixing, the "Create New Sheet" feature should work!** ✅

