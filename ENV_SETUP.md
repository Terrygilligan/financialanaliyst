# Environment Variables Setup Guide

## Current Status

✅ **Gemini API Key**: Already configured in `functions/.env`  
⏳ **Google Sheets Service Account Key**: Needs to be added  
⏳ **Google Sheet ID**: Needs to be added  

## Step-by-Step Setup

### 1. Your `.env` File Location
The `.env` file should be located at: `functions/.env`

### 2. Current `.env` File Structure

Your `.env` file should contain:

```env
# Gemini API Configuration
GEMINI_API_KEY=AIzaSyAm26HDnJPOwcwSJE8TTn7zEObQE7yr-PY
GEMINI_MODEL=gemini-1.5-flash

# Google Sheets Configuration
# TODO: Add your Service Account JSON key here (as a single-line string)
GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY=

# TODO: Add your Google Sheet ID here
GOOGLE_SHEET_ID=
```

### 3. Adding the Service Account Key

After you create the Service Account for Google Sheets and download the JSON key file:

**Option A: Using PowerShell (Windows)**
```powershell
# Read the JSON file and convert to a single-line string
$json = Get-Content "path\to\sheets-writer-key.json" -Raw | ConvertFrom-Json | ConvertTo-Json -Compress
# Then paste the result into your .env file
```

**Option B: Manual Method**
1. Open the downloaded JSON key file (e.g., `sheets-writer-key.json`)
2. Copy the entire JSON content
3. Paste it into your `.env` file as a single-line string
4. Wrap it in single quotes: `GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'`

**Important**: The JSON must be on a single line with escaped newlines in the private key.

### 4. Adding the Google Sheet ID

1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
3. Copy the `SHEET_ID` part
4. Add it to `.env`: `GOOGLE_SHEET_ID=your-sheet-id-here`

### 5. Final `.env` File Should Look Like:

```env
# Gemini API Configuration
GEMINI_API_KEY=AIzaSyAm26HDnJPOwcwSJE8TTn7zEObQE7yr-PY
GEMINI_MODEL=gemini-1.5-flash

# Google Sheets Configuration
GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"financialanaliyst","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"sheets-writer@financialanaliyst.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
GOOGLE_SHEET_ID=1fH-K0V123...your...actual...sheet...id...xyz
```

## Security Checklist

- ✅ `.env` file is in `.gitignore` (will not be committed)
- ✅ Service Account key file is in `.gitignore`
- ⚠️ **NEVER** commit the `.env` file to Git
- ⚠️ **NEVER** share your API keys or Service Account keys publicly

## How the Code Uses These Variables

### In `functions/src/gemini.ts`:
```typescript
const apiKey = process.env.GEMINI_API_KEY; // Reads from .env
```

### In `functions/src/sheets.ts`:
```typescript
const serviceAccountKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
const credentials = JSON.parse(serviceAccountKey); // Parses the JSON string
```

### In `functions/src/index.ts`:
```typescript
const sheetId = process.env.GOOGLE_SHEET_ID; // Reads from .env
```

## Deployment

When you deploy with `firebase deploy --only functions`, the environment variables from `.env` will be automatically loaded by the `dotenv` package (already configured in `functions/src/index.ts`).

For production, consider using Google Secret Manager for enhanced security.
