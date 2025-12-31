# Fix: "The caller does not have permission" Error

## Problem
When provisioning a business, you get:
```
Error: Failed to provision business: The caller does not have permission
```

## Root Cause
Service accounts have **0 GB storage quota** in their own Drive. They cannot create files directly in their Drive. They need to create files in a **shared folder** that belongs to a real user's Drive.

## Solution: Use Shared Folder

### Step 1: Create/Verify Shared Folder

1. **Go to Google Drive**: https://drive.google.com
2. **Create or find a folder** (e.g., "Financial Analyst Businesses")
3. **Right-click** → **"Share"**
4. **Add service account** as Editor:
   - Email: `<SERVICE_ACCOUNT_EMAIL>`
   - Role: **Editor**
   - **Uncheck** "Notify people"
5. **Click "Share"**

### Step 2: Get Folder ID

1. **Open the folder** in Google Drive
2. **Copy the Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   ```
   Example: `<YOUR_FOLDER_ID>`

### Step 3: Add to Environment Variables

**For Local Emulator Testing:**

Add to `functions/.env`:
```env
GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here
```

**Example:**
```env
GOOGLE_DRIVE_FOLDER_ID=<YOUR_FOLDER_ID>
```

### Step 4: Enable Google Drive API

1. **Go to**: https://console.cloud.google.com/apis/library/drive.googleapis.com?project=<YOUR_PROJECT_ID>
2. **Click "Enable"**
3. **Wait 1-2 minutes** for propagation

### Step 5: Restart Emulators

After adding the folder ID:

```powershell
# Stop emulators (Ctrl+C)
# Then restart:
firebase emulators:start
```

### Step 6: Test

1. Go to: http://localhost:5000/business-signup.html
2. Enter business name
3. Sign in with Google
4. Business should be created successfully! ✅

## Alternative: Verify Current Setup

If you already have a folder ID configured, verify it's correct:

```powershell
# Check if folder ID is set (in functions directory)
cd functions
Get-Content .env | Select-String "GOOGLE_DRIVE_FOLDER_ID"
```

## Why This Works

- ✅ Service account can create files in folders it has access to
- ✅ Your Drive has 15GB quota (plenty of space)
- ✅ All business folders will be organized in one place
- ✅ You can see and manage all folders in your Drive

## Troubleshooting

**Still getting permission error?**

1. **Verify folder is shared**: Check folder sharing settings in Google Drive
2. **Check service account email**: Must be exactly `<SERVICE_ACCOUNT_EMAIL>`
3. **Verify Drive API is enabled**: Check Google Cloud Console
4. **Check emulator logs**: Look for detailed error messages in the terminal running `firebase emulators:start`

