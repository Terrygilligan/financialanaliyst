# Troubleshooting: Sheet Creation Permission Denied

## Current Status
- ✅ Google Sheets API: Enabled and accessible
- ✅ Google Drive API: Enabled and accessible (can list files)
- ❌ Sheet Creation: Still getting 403 "Permission denied"

## Possible Causes

### 1. Permissions Haven't Propagated Yet
Google Cloud permissions can take **2-5 minutes** to fully propagate. If you just added the Editor role, wait a few minutes and try again.

### 2. Need to Restart Firebase Emulators
The emulators cache authentication. After changing IAM permissions:
```powershell
# Stop emulators (Ctrl+C)
firebase emulators:start
```

### 3. Verify Editor Role is Correct
Make sure in IAM you granted:
- **Role**: `Editor` (not "Service Account Editor" or "Service Account User")
- **Principal**: `<SERVICE_ACCOUNT_EMAIL>`

### 4. Check Service Account Key
The service account key might be using old permissions. If you regenerated the key recently, make sure the environment variable is updated.

## Quick Fix Steps

1. **Verify IAM Role:**
   - Go to: https://console.cloud.google.com/iam-admin/iam?project=<YOUR_PROJECT_ID>
   - Find: `<SERVICE_ACCOUNT_EMAIL>`
   - Should show: **Role: Editor**

2. **Wait 2-3 minutes** for permissions to propagate

3. **Restart Firebase Emulators:**
   ```powershell
   # Stop (Ctrl+C)
   firebase emulators:start
   ```

4. **Test Again:**
   ```powershell
   node check-drive-api-status.js
   ```

5. **If Still Failing:**
   - Try granting **Owner** role temporarily to test
   - Or check if there are any Organization Policies blocking resource creation

## Alternative: Use Existing Sheet Instead

If creation continues to fail, you can:
1. Manually create a Google Sheet
2. Share it with: `<SERVICE_ACCOUNT_EMAIL>` (Editor access)
3. Use "Use Existing Sheet" option in the admin UI
4. Enter the Sheet ID

This bypasses the creation permission issue.

