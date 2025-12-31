# Enable Google Drive API - Quick Guide

## ✅ Current Status
- ✅ Google Sheets API: **Enabled and Working**
- ❌ Google Drive API: **Still needs to be enabled**

## 🚀 Quick Fix

### Step 1: Enable Google Drive API

1. **Go to Google Cloud Console APIs:**
   - Direct link: https://console.cloud.google.com/apis/library/drive.googleapis.com?project=<YOUR_PROJECT_ID>
   - Or: Google Cloud Console → APIs & Services → Library → Search "Google Drive API"

2. **Enable the API:**
   - Click on "Google Drive API"
   - Click the **"Enable"** button
   - Wait a few seconds for it to enable

### Step 2: Verify

After enabling, run the verification script again:
```powershell
node verify-service-account-permissions.js
```

You should see:
- ✅ Google Sheets API: Accessible
- ✅ Google Drive API: Can create sheets

### Step 3: Test in UI

1. **Restart Firebase emulators** (if running):
   ```powershell
   # Stop emulators (Ctrl+C)
   firebase emulators:start
   ```

2. **Test sheet creation:**
   - Go to: http://127.0.0.1:5000/admin-sheets.html
   - Select "Create New Sheet"
   - Enter a name
   - Click "Create New Sheet Config"
   - Should work now! ✅

---

**Note:** Google Drive API is required because creating a new Google Sheet actually creates a file in Google Drive. Both APIs need to be enabled for the feature to work.

