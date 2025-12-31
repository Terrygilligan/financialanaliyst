# Setup: Create Drive Folder for Sheets

## Quick Setup Steps

Since you don't have Shared Drive access (requires Google Workspace), we'll create sheets in **your personal Drive folder**.

### Step 1: Create Folder in Your Drive

1. Go to https://drive.google.com
2. Click **"New"** → **"Folder"**
3. Name it: **"Financial Analyst Sheets"**
4. Click **"Create"**

### Step 2: Share Folder with Service Account

1. **Right-click** the folder → **"Share"**
2. In the "Add people and groups" field, enter:
   ```
   financial-output@financialanaliyst.iam.gserviceaccount.com
   ```
3. Set role to: **"Editor"**
4. **Uncheck** "Notify people" (service accounts don't need email notifications)
5. Click **"Share"**

### Step 3: Get Folder ID

1. **Open** the folder
2. Look at the URL in your browser:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   ```
3. Copy the **FOLDER_ID_HERE** part (long string of letters/numbers)

### Step 4: Add Folder ID to Environment

Add to `functions/.env`:
```
GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here
```

### Step 5: Rebuild and Test

```powershell
cd functions
npm run build
firebase deploy --only functions
```

Then test creating a sheet - it should work! ✅

---

**Why This Works**:
- Service account can create files in folders it has access to
- Your Drive has 15GB quota (plenty of space)
- All sheets will be organized in one folder
- You can see and manage all sheets in your Drive

