# Fix: Emulator 404 and Google Sheets Permission Errors

## ✅ Good News

The emulator detection is working perfectly! You can see:
- ✅ `🔧 Emulator mode enabled (auto-detected localhost)`
- ✅ `✅ Connected to Functions emulator on localhost:5001`
- ✅ `✅ Connected to Auth emulator on localhost:9099`
- ✅ `✅ Connected to Firestore emulator on localhost:8080`

---

## 🐛 Two Issues to Fix

### Issue 1: 404 Error for `getBusinessDetails`

**Problem**: Function returns 404 in emulator

**Solution**: Functions need to be built and emulator restarted

```bash
# 1. Build functions
cd functions
npm run build
cd ..

# 2. Restart emulators (stop with Ctrl+C, then restart)
firebase emulators:start
```

**Verify**: Check Emulator UI at http://localhost:4000 → Functions tab → Should see `getBusinessDetails` listed

---

### Issue 2: Permission Error Creating Google Sheet

**Problem**: `The caller does not have permission` when creating Google Sheet

**This is a REAL Google API error** (not an emulator issue). Even in emulator mode, Google Sheets API calls go to real Google services.

**Root Cause**: Service account doesn't have permission to create Google Sheets

**Solutions**:

#### Option A: Enable APIs and Grant Permissions (Recommended)

1. **Enable Google Sheets API**:
   - Go to: https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=financialanaliyst
   - Click **"Enable"**

2. **Enable Google Drive API**:
   - Go to: https://console.cloud.google.com/apis/library/drive.googleapis.com?project=financialanaliyst
   - Click **"Enable"**

3. **Grant Service Account Permissions**:
   - Service Account: `financial-output@financialanaliyst.iam.gserviceaccount.com`
   - Grant roles:
     - **Editor** or **Owner** on the project
     - Or specific roles: `roles/drive.file` and `roles/spreadsheets.editor`

#### Option B: Use OAuth Token (Alternative)

The function supports OAuth tokens. If you sign in with Google, it can use your OAuth token instead of the service account.

**Note**: The current implementation tries service account first, then falls back to OAuth if available.

---

## 🔍 Check Current Status

### 1. Verify Functions Are Built

Check if `functions/lib/` directory exists and has compiled JavaScript files:
```bash
ls functions/lib/
```

Should see files like:
- `index.js`
- `business-management.js`
- `business-provisioning.js`

### 2. Check Emulator UI

1. Go to: http://localhost:4000
2. Click **"Functions"** tab
3. Look for `getBusinessDetails` and `provisionNewBusiness` in the list

If they're not there, functions aren't loaded. Rebuild and restart.

### 3. Check Environment Variables

Make sure `functions/.env` exists with:
```env
GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### 4. Check Service Account Permissions

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=financialanaliyst
2. Find: `financial-output@financialanaliyst.iam.gserviceaccount.com`
3. Check roles - should have Editor or Owner

---

## 🚀 Quick Fix Steps

### Step 1: Build Functions
```bash
cd functions
npm run build
cd ..
```

### Step 2: Restart Emulators
```bash
# Stop current emulators (Ctrl+C)
firebase emulators:start
```

### Step 3: Enable Google APIs
1. Enable Sheets API: https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=financialanaliyst
2. Enable Drive API: https://console.cloud.google.com/apis/library/drive.googleapis.com?project=financialanaliyst

### Step 4: Grant Service Account Permissions
1. Go to: https://console.cloud.google.com/iam-admin/iam?project=financialanaliyst
2. Find service account
3. Grant **Editor** role

### Step 5: Test Again
Refresh the business signup page and try again.

---

## 📋 Expected Behavior After Fix

### When Functions Are Built
- ✅ No 404 errors
- ✅ Functions appear in Emulator UI
- ✅ `getBusinessDetails` returns data or "not found" (not 404)

### When Permissions Are Fixed
- ✅ `provisionNewBusiness` succeeds
- ✅ Google Drive folder created
- ✅ Google Sheet created
- ✅ Business document saved to Firestore

---

## 🐛 If Still Not Working

### Functions Still 404
1. Check terminal running emulators for errors
2. Verify `functions/lib/index.js` exports the functions
3. Check TypeScript compilation succeeded (no errors in build output)

### Permission Still Denied
1. Verify APIs are enabled (check API dashboard)
2. Verify service account has Editor role
3. Check `functions/.env` has correct service account key
4. Try using OAuth token instead (sign in with Google)

---

**Status**: Fix the two issues above and it should work! 🚀

