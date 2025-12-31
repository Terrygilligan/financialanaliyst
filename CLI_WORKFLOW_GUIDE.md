# CLI Workflow Guide - Enterprise Setup

Complete guide to managing your Firebase/GCP project using CLI tools instead of the web console.

## 🚀 Quick Start

### 1. Initial Setup (One-Time)

```bash
# Windows PowerShell
.\setup-cloud.ps1

# Linux/Mac/Git Bash
./setup-cloud.sh
```

This script:
- Sets the active GCP project
- Enables all required APIs
- Creates the service account
- Grants all necessary IAM roles
- Generates a service account key file

### 2. Fix Permissions (When You Get 403 Errors)

```bash
# Windows PowerShell
.\fix-permissions.ps1

# Linux/Mac/Git Bash
./fix-permissions.sh
```

This script:
- Enables Drive and Sheets APIs
- Grants Secret Manager access
- Grants Service Account Token Creator role
- Grants Cloud Run Invoker role
- Grants Datastore User role

### 3. Verify Everything Works

```bash
# Windows PowerShell
.\verify-permissions.ps1 [YOUR_SHEET_ID]

# Linux/Mac/Git Bash
./verify-permissions.sh [YOUR_SHEET_ID]
```

This script checks:
- Service account exists
- APIs are enabled
- IAM roles are granted
- Service account key file is valid
- Can access your Google Sheet (if ID provided)

## 🧹 Emulator Management

### Clear All Emulator Data

```bash
# Windows PowerShell
Invoke-WebRequest -Method DELETE -Uri "http://localhost:8080/emulator/v1/projects/financialanaliyst/databases/(default)/documents"

# Linux/Mac/Git Bash
./clear-emulator.sh
```

### Clear Specific Collection

```bash
# Windows PowerShell
Invoke-WebRequest -Method DELETE -Uri "http://localhost:8080/emulator/v1/projects/financialanaliyst/databases/(default)/documents/businesses"

# Linux/Mac/Git Bash
./clear-emulator.sh 8080 businesses
```

## 🔍 Master Check Command

Test if your service account can access a Google Sheet before running the emulator:

```bash
# Replace [SHEET_ID] with your actual Google Sheet ID
gcloud drive files describe [SHEET_ID] \
    --impersonate-service-account=backend-sa@financialanaliyst.iam.gserviceaccount.com \
    --project=financialanaliyst
```

**If it works:** You'll see JSON file metadata. Permissions are correct! ✅  
**If it fails:** The sheet isn't shared with the service account. Share it in Google Sheets. ❌

## 📋 Manual Commands Reference

### Enable APIs

```bash
gcloud services enable \
    drive.googleapis.com \
    sheets.googleapis.com \
    firestore.googleapis.com \
    cloudfunctions.googleapis.com \
    secretmanager.googleapis.com \
    iam.googleapis.com \
    --project=financialanaliyst
```

### Grant IAM Roles

```bash
SA_EMAIL="backend-sa@financialanaliyst.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding financialanaliyst \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding financialanaliyst \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/iam.serviceAccountTokenCreator"

gcloud projects add-iam-policy-binding financialanaliyst \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/run.invoker"

gcloud projects add-iam-policy-binding financialanaliyst \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/datastore.user"
```

### Create Service Account Key

```bash
gcloud iam service-accounts keys create ./functions/service-account-key.json \
    --iam-account=backend-sa@financialanaliyst.iam.gserviceaccount.com \
    --project=financialanaliyst
```

### Set Environment Variable

**Windows PowerShell:**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="$(Get-Location)\functions\service-account-key.json"
```

**Linux/Mac/Git Bash:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/functions/service-account-key.json"
```

## 🐛 Troubleshooting

### "The caller does not have permission"

1. **Run the fix script:**
   ```bash
   ./fix-permissions.sh
   ```

2. **Verify the service account has access:**
   ```bash
   ./verify-permissions.sh [YOUR_SHEET_ID]
   ```

3. **Check if the sheet is shared:**
   - Open your Google Sheet
   - Click "Share"
   - Add: `backend-sa@financialanaliyst.iam.gserviceaccount.com`
   - Grant "Editor" role

### "Service account not found"

Run the setup script:
```bash
./setup-cloud.sh
```

### "API not enabled"

Enable it manually:
```bash
gcloud services enable [API_NAME] --project=financialanaliyst
```

Or run the fix script which enables all required APIs.

## 📝 Best Practices

1. **Always verify before deploying:**
   ```bash
   ./verify-permissions.sh [YOUR_SHEET_ID]
   ```

2. **Clear emulator data between tests:**
   ```bash
   ./clear-emulator.sh
   ```

3. **Use scripts instead of manual commands:**
   - Scripts are repeatable
   - Scripts are traceable
   - Scripts avoid typos

4. **Save your commands:**
   - Keep this guide updated
   - Document any custom commands
   - Share with your team

## 🎯 Enterprise Workflow

### Daily Development

1. Start emulators: `firebase emulators:start`
2. Clear old data: `./clear-emulator.sh`
3. Test your changes
4. Verify permissions: `./verify-permissions.sh`

### Before Deployment

1. Verify all permissions: `./verify-permissions.sh [PROD_SHEET_ID]`
2. Check service account roles
3. Ensure APIs are enabled
4. Test with production service account

### When Things Break

1. Run fix script: `./fix-permissions.sh`
2. Verify: `./verify-permissions.sh`
3. Check logs: `firebase functions:log`
4. Clear and retry: `./clear-emulator.sh`

---

**Last Updated:** December 2025  
**Project:** financialanaliyst  
**Service Account:** backend-sa@financialanaliyst.iam.gserviceaccount.com

