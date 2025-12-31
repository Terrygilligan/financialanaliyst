# Fix: Google Drive API Permission Denied

## 🔴 Current Issue
The verification script shows:
- ✅ Google Sheets API: Working
- ❌ Google Drive API: Permission denied

## ✅ Solution: Grant Project-Level IAM Role

The service account needs the **Editor role at the PROJECT level** (not just on the service account itself).

### Step 1: Go to IAM & Admin → IAM

1. **Open IAM page:**
   - Direct link: https://console.cloud.google.com/iam-admin/iam?project=financialanaliyst
   - Or: Google Cloud Console → IAM & Admin → IAM

### Step 2: Find or Add Service Account

1. **Look for:** `financial-output@financialanaliyst.iam.gserviceaccount.com`
2. **If it's NOT in the list:**
   - Click **"+ Grant Access"** button (top of the page)
   - In "New principals" field, enter: `financial-output@financialanaliyst.iam.gserviceaccount.com`
   - In "Select a role" dropdown, choose: **"Editor"**
   - Click **"Save"**

3. **If it IS in the list but has wrong role:**
   - Click the **pencil icon (✏️)** next to the service account
   - Change the role to **"Editor"**
   - Click **"Save"**

### Step 3: Verify Google Drive API is Enabled

1. **Check API status:**
   - Go to: https://console.cloud.google.com/apis/library/drive.googleapis.com?project=financialanaliyst
   - Should show: **"Status: Enabled"**
   - If not, click **"Enable"**

### Step 4: Wait for Propagation

- Google Cloud permissions can take 1-2 minutes to propagate
- Wait a minute, then test again

### Step 5: Verify Fix

Run the verification script:
```powershell
node verify-service-account-permissions.js
```

You should see:
- ✅ Google Sheets API: Accessible
- ✅ Google Drive API: Can create sheets

### Step 6: Restart Emulators

After permissions are fixed:
```powershell
# Stop emulators (Ctrl+C)
firebase emulators:start
```

## 🔍 Key Difference

- **Service Account Access Tab**: Controls who can USE the service account
- **IAM Tab**: Controls what the service account can DO (create resources, etc.)

For creating Google Sheets, the service account needs **Editor role in IAM** (project-level permissions).

---

**After completing these steps, the sheet creation should work!** ✅

