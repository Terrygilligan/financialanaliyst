# Fix: Service Account Permission to Create Google Sheets

## 🔴 Current Error
```
Failed to create Google Sheet: The caller does not have permission
```

## ✅ Solution: Enable APIs and Grant Permissions

### Step 1: Enable Required APIs

1. **Go to Google Cloud Console APIs & Services:**
   - Visit: https://console.cloud.google.com/apis/library?project=financialanaliyst
   - Or: Google Cloud Console → APIs & Services → Library

2. **Enable Google Sheets API:**
   - Search for: `Google Sheets API`
   - Click on it
   - Click **"Enable"** button
   - Wait for it to enable (usually instant)

3. **Enable Google Drive API:**
   - Search for: `Google Drive API`
   - Click on it
   - Click **"Enable"** button
   - Wait for it to enable (usually instant)

### Step 2: Grant Service Account Permissions

1. **Go to IAM & Admin → Service Accounts:**
   - Visit: https://console.cloud.google.com/iam-admin/serviceaccounts?project=financialanaliyst
   - Or: Google Cloud Console → IAM & Admin → Service Accounts

2. **Find Your Service Account:**
   - Look for: `financial-output@financialanaliyst.iam.gserviceaccount.com`
   - Click on it

3. **Grant Permissions:**
   - Click **"Permissions"** tab
   - Click **"Grant Access"** or **"Add Principal"**
   - In the "New principals" field, enter: `financial-output@financialanaliyst.iam.gserviceaccount.com`
   - Select these roles:
     - ✅ **Service Account User** (if not already present)
     - ✅ **Editor** (or **Owner** for full access)
   - Click **"Save"**

### Step 3: Verify Service Account Key

1. **Check Environment Variable:**
   ```powershell
   # In your terminal, check if the key is set
   $env:GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY
   ```

2. **Verify Key Format:**
   - Should be valid JSON
   - Should contain: `client_email`, `private_key`, `project_id`
   - `project_id` should be: `financialanaliyst`

### Step 4: Test the Fix

1. **Restart Firebase Emulators** (if running locally):
   ```powershell
   # Stop emulators (Ctrl+C)
   # Then restart:
   firebase emulators:start
   ```

2. **Try Creating a Sheet Again:**
   - Go to: http://127.0.0.1:5000/admin-sheets.html
   - Select "Create New Sheet"
   - Enter a name (e.g., "Test Sheet")
   - Click "Create New Sheet Config"
   - Should work now! ✅

### Step 5: Verify APIs Are Enabled (Quick Check)

Run this in your browser console on the admin-sheets page:
```javascript
// This won't directly test, but you can check Cloud Console
// Or check Firebase Functions logs:
```

Or check via command line:
```powershell
# List enabled APIs (requires gcloud CLI)
gcloud services list --enabled --project=financialanaliyst | findstr "sheets\|drive"
```

## 🔍 Verification Checklist

After completing the steps above, verify:

- [ ] Google Sheets API is enabled in Cloud Console
- [ ] Google Drive API is enabled in Cloud Console
- [ ] Service account has "Editor" or "Owner" role
- [ ] Service account key is valid JSON
- [ ] Environment variable is set correctly
- [ ] Firebase emulators restarted (if testing locally)
- [ ] Can create a new sheet via admin UI

## 🐛 Still Not Working?

### Check Cloud Function Logs:
```powershell
firebase functions:log --only createNewGoogleSheet
```

### Common Issues:

1. **"API not enabled"**
   - Fix: Enable Google Sheets API and Google Drive API

2. **"Permission denied"**
   - Fix: Grant Editor/Owner role to service account

3. **"Invalid credentials"**
   - Fix: Regenerate service account key and update environment variable

4. **"Project not found"**
   - Fix: Verify `project_id` in service account key matches Firebase project

### Alternative: Use Domain-Wide Delegation (Advanced)

If you're in a Google Workspace domain:

1. Enable Domain-Wide Delegation in service account settings
2. Add scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/drive.file`

## 📝 Quick Reference

**Service Account Email:** `financial-output@financialanaliyst.iam.gserviceaccount.com`  
**Project ID:** `financialanaliyst`  
**Required APIs:** Google Sheets API, Google Drive API  
**Required Role:** Editor or Owner

---

**After fixing, the "Create New Sheet" feature should work!** ✅

