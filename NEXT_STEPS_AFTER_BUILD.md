# Next Steps After Build ✅

## ✅ Step 1: Build Complete!

Functions have been built successfully. The compiled JavaScript is now in `functions/lib/`.

---

## 🔄 Step 2: Restart Emulators

**You need to do this manually** (since emulators are a long-running process):

1. **Stop current emulators**: Press `Ctrl+C` in the terminal running `firebase emulators:start`
2. **Restart emulators**:
   ```bash
   firebase emulators:start
   ```

**Verify**: 
- Go to http://localhost:4000 → Functions tab
- You should now see `getBusinessDetails` and `provisionNewBusiness` listed

---

## 🌐 Step 3: Enable Google APIs

### Enable Google Sheets API

1. **Open this link**: https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=<YOUR_PROJECT_ID>
2. Click the **"Enable"** button
3. Wait for it to enable (usually takes a few seconds)

### Enable Google Drive API

1. **Open this link**: https://console.cloud.google.com/apis/library/drive.googleapis.com?project=<YOUR_PROJECT_ID>
2. Click the **"Enable"** button
3. Wait for it to enable (usually takes a few seconds)

**Verify**: Both APIs should show "API enabled" status

---

## 🔐 Step 4: Grant Service Account Permissions

1. **Open IAM page**: https://console.cloud.google.com/iam-admin/iam?project=<YOUR_PROJECT_ID>
2. **Find the service account**: Look for `<SERVICE_ACCOUNT_EMAIL>`
3. **Click the pencil icon** (Edit) next to it
4. **Click "+ ADD ANOTHER ROLE"**
5. **Select "Editor"** from the dropdown
6. **Click "Save"**

**Alternative**: If you can't find the service account, you can also:
- Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=<YOUR_PROJECT_ID>
- Find `<SERVICE_ACCOUNT_EMAIL>`
- Click on it → Go to "Permissions" tab → Grant Editor role

---

## ✅ Step 5: Verify Everything

### Check Functions Are Loaded
- Go to: http://localhost:4000 (Emulator UI)
- Click **"Functions"** tab
- Should see: `getBusinessDetails`, `provisionNewBusiness`, etc.

### Check APIs Are Enabled
- Go to: https://console.cloud.google.com/apis/dashboard?project=<YOUR_PROJECT_ID>
- Should see both "Google Sheets API" and "Google Drive API" listed and enabled

### Check Service Account Permissions
- Go to: https://console.cloud.google.com/iam-admin/iam?project=<YOUR_PROJECT_ID>
- Find service account → Should have "Editor" role

---

## 🧪 Step 6: Test Business Signup

1. **Make sure emulators are running**
2. **Open**: http://localhost:5000/business-signup.html
3. **Enter business name**
4. **Click "Sign in with Google"**
5. **Complete sign-in**
6. **Watch for success!**

---

## 🐛 If You Still See Errors

### Functions Still 404
- Make sure you restarted emulators after building
- Check Emulator UI → Functions tab → Functions should be listed

### Permission Still Denied
- Double-check APIs are enabled (refresh the API dashboard)
- Verify service account has Editor role (check IAM page)
- Wait 1-2 minutes for permissions to propagate

---

**Status**: ✅ Functions built! Now restart emulators and enable APIs/permissions, then test! 🚀

