# Fix 403 Error: Sheet Creation Permission Denied

## Current Status

✅ **Service Account Verified**: `financial-output@financialanaliyst.iam.gserviceaccount.com`  
✅ **Code Uses Explicit Credentials**: Not using ADC, using credentials from env var  
✅ **APIs Enabled**: Google Sheets API and Google Drive API  
✅ **IAM Role**: Owner role granted  
❌ **Still Getting 403**: "The caller does not have permission"

## Diagnostic: Check Cloud Logs

The most important step is to see **which identity Google thinks is calling**:

1. **Go to Cloud Logs**:
   - https://console.cloud.google.com/logs/query?project=financialanaliyst

2. **Filter for the error**:
   ```
   resource.type="cloud_function"
   textPayload=~"createNewGoogleSheet"
   severity>=ERROR
   ```

3. **Or search for permission errors**:
   ```
   protoPayload.status.code="7"
   ```

4. **Look for `principalEmail`** in the log entry:
   - If it shows: `financial-output@financialanaliyst.iam.gserviceaccount.com` → Permissions not propagated yet
   - If it shows: `622000096460-compute@developer.gserviceaccount.com` → Default Compute Engine SA needs Editor role
   - If it shows: Your personal email → Wrong credentials being used

## Solutions Based on Logs

### If principalEmail = financial-output@...

**Solution**: Wait longer (20-30 minutes) or verify:
1. Google Drive API is enabled for this service account's project
2. The service account has Drive API quota available
3. Try granting **Owner** role (you already did this)

### If principalEmail = compute@developer...

**Solution**: Grant Editor role to default Compute Engine SA:
1. Go to: https://console.cloud.google.com/iam-admin/iam?project=financialanaliyst
2. Find: `622000096460-compute@developer.gserviceaccount.com`
3. Grant **Editor** role
4. Wait 5-10 minutes

### If principalEmail = your personal email...

**Solution**: The emulator is using your personal credentials:
1. Set `GOOGLE_APPLICATION_CREDENTIALS` to point to service account key file
2. Or ensure the env var is loaded correctly in emulator

## Code Verification

The code in `sheet-operations.ts` now includes logging:
- Logs which service account email is being used
- Logs the project ID
- This will appear in Cloud Function logs

**After next deployment**, check logs for:
```
[Sheet Operations] Using service account: financial-output@...
```

## Quick Workaround

While diagnosing, use **"Use Existing Sheet"** option:
1. Manually create a Google Sheet
2. Share with: `financial-output@financialanaliyst.iam.gserviceaccount.com` (Editor)
3. Use the Sheet ID in admin UI
4. This bypasses the creation permission issue

## Next Steps

1. **Deploy the updated code** (with logging):
   ```powershell
   firebase deploy --only functions
   ```

2. **Try creating a sheet** in production

3. **Check Cloud Logs** immediately after the error:
   - Look for the `principalEmail` field
   - This tells us exactly which identity is calling

4. **Fix based on the principalEmail**:
   - If it's the compute SA → Grant Editor role
   - If it's your service account → Wait longer or check API enablement
   - If it's your email → Fix credential loading

---

**The logs will tell us exactly what's happening!** Check them after the next deployment.

