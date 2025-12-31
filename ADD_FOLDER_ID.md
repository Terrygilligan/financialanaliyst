# Add Folder ID to Environment

## Folder ID Extracted

From your Google Drive URL:
```
https://drive.google.com/drive/folders/<YOUR_FOLDER_ID>
```

**Folder ID**: `<YOUR_FOLDER_ID>`

## Add to functions/.env

Add this line to your `functions/.env` file:

```
GOOGLE_DRIVE_FOLDER_ID=<YOUR_FOLDER_ID>
```

## Verify Folder is Shared

Before testing, make sure:

1. ✅ The folder is shared with the service account:
   - Email: `<SERVICE_ACCOUNT_EMAIL>`
   - Role: **Editor**
   - Notify: **Unchecked**

2. ✅ The service account can access the folder

## Test

After adding the folder ID:

```powershell
cd functions
npm run build
firebase deploy --only functions
```

Then test creating a sheet in the admin UI - it should work! ✅

