# Verify Folder Sharing with Service Account

## Quick Check

1. **Open the folder**:
   - https://drive.google.com/drive/folders/<YOUR_FOLDER_ID>

2. **Click the "Share" button** (top right)

3. **Look for the service account**:
   - Email: `<SERVICE_ACCOUNT_EMAIL>`
   - Should show as: **Editor** or **Can edit**

4. **If it's not there, add it**:
   - Click "Add people and groups"
   - Enter: `<SERVICE_ACCOUNT_EMAIL>`
   - Select role: **Editor**
   - **Uncheck** "Notify people" (optional, but recommended)
   - Click "Share"

## About "Notify people"

- **Service accounts don't receive emails** - so it doesn't matter if you checked or unchecked it
- **It's just good practice** to uncheck it to avoid unnecessary notifications
- **The important part** is that the service account has **Editor** access

## Test It

After verifying sharing, test sheet creation:
1. Go to admin UI
2. Try creating a new sheet
3. Check if it appears in your Drive folder

If it works, you're all set! ✅

