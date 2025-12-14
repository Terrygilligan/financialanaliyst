# Backend Setup Guide

This guide walks you through setting up the AI Financial Analyst backend.

## Prerequisites

- Node.js 20+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- A Google Cloud Platform (GCP) account
- A Firebase project created

## Step 1: Firebase Project Setup

1. **Create a Firebase Project** (if you haven't already):
   ```bash
   firebase login
   firebase projects:create your-project-id
   firebase use your-project-id
   ```

2. **Initialize Firebase in your project**:
   ```bash
   firebase init functions
   ```
   - Select your existing project
   - Choose TypeScript
   - Use ESLint (optional)
   - Install dependencies now (yes)

## Step 2: Install Dependencies

```bash
cd functions
npm install
```

## Step 3: Configure Storage Bucket

1. **Get your Storage bucket name**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Navigate to Storage
   - Your default bucket is usually: `your-project-id.appspot.com`

2. **Update the bucket name** in `functions/src/index.ts`:
   ```typescript
   bucket: "your-project-id.appspot.com", // Replace with your actual bucket
   ```

## Step 4: Enable Required APIs

Enable these APIs in your GCP project:

1. Go to [GCP Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Enabled APIs & Services**
3. Click **+ ENABLE APIS AND SERVICES**
4. Enable:
   - **Google Sheets API**
   - **Generative Language API** (for Gemini) OR **Vertex AI API**

## Step 5: Create Service Account for Google Sheets

1. **Create Service Account**:
   - Go to [GCP Console](https://console.cloud.google.com)
   - Navigate to **IAM & Admin** → **Service Accounts**
   - Click **+ CREATE SERVICE ACCOUNT**
   - Name: `sheets-writer` (or any name you prefer)
   - Click **CREATE AND CONTINUE**

2. **Grant Permissions**:
   - Role: **Google Sheets Editor** (or **Editor**)
   - Click **CONTINUE** → **DONE**

3. **Create and Download Key**:
   - Click on the created service account
   - Go to **KEYS** tab
   - Click **ADD KEY** → **Create new key**
   - Choose **JSON** format
   - Download the key file (e.g., `sheets-writer-key.json`)
   - **⚠️ IMPORTANT**: Never commit this file to git!

4. **Get the Service Account Email**:
   - Copy the email address (e.g., `sheets-writer@your-project-id.iam.gserviceaccount.com`)
   - You'll need this to share the Google Sheet

## Step 6: Create and Configure Google Sheet

1. **Create a new Google Sheet**:
   - Go to [Google Sheets](https://sheets.google.com)
   - Create a new spreadsheet
   - Name it (e.g., "Financial Receipts")

2. **Set up Headers** (Row 1):
   ```
   Vendor Name | Date | Total Amount | Category | Timestamp
   ```

3. **Share with Service Account**:
   - Click **Share** button
   - Paste the Service Account email (from Step 5.4)
   - Grant **Editor** access
   - Click **Send**

4. **Get the Sheet ID**:
   - From the Sheet URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - Copy the `SHEET_ID` part

## Step 7: Get Gemini API Key

1. **Option A: Using API Key (Simpler)**:
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Click **Create API Key**
   - Copy the key

2. **Option B: Using Vertex AI (More Secure)**:
   - Ensure your Cloud Function has **Vertex AI User** role
   - No API key needed, uses default credentials

## Step 8: Configure Environment Variables

You have two options for setting environment variables:

### Option A: Using Firebase Functions Config (Recommended for Production)

```bash
# Set the Service Account JSON as a string
firebase functions:config:set \
  google_sheets.service_account_key="$(cat path/to/sheets-writer-key.json)" \
  google_sheets.sheet_id="your-sheet-id-here" \
  gemini.api_key="your-gemini-api-key-here"

# Optional: Set Gemini model
firebase functions:config:set gemini.model="gemini-1.5-flash"
```

**Note**: For 2nd Gen Functions, you need to use `.env` or Secret Manager instead (see Option B).

### Option B: Using .env File (For 2nd Gen Functions)

1. **Create `.env` file** in the `functions/` directory:
   ```bash
   cd functions
   touch .env
   ```

2. **Add environment variables**:
   ```env
   GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
   GOOGLE_SHEET_ID=your-sheet-id-here
   GEMINI_API_KEY=your-gemini-api-key-here
   GEMINI_MODEL=gemini-1.5-flash
   ```

   **To get the JSON string**:
   ```bash
   # On Linux/Mac:
   cat sheets-writer-key.json | jq -c
   
   # On Windows (PowerShell):
   Get-Content sheets-writer-key.json | ConvertFrom-Json | ConvertTo-Json -Compress
   ```

3. **Update `functions/src/index.ts`** to load .env:
   ```typescript
   import * as dotenv from 'dotenv';
   dotenv.config();
   ```

   Add `dotenv` to dependencies:
   ```bash
   cd functions
   npm install dotenv
   ```

### Option C: Using Secret Manager (Most Secure for Production)

1. **Create secrets in Secret Manager**:
   ```bash
   # Create secrets
   echo -n '{"type":"service_account",...}' | gcloud secrets create sheets-service-account-key --data-file=-
   echo -n 'your-sheet-id' | gcloud secrets create google-sheet-id --data-file=-
   echo -n 'your-api-key' | gcloud secrets create gemini-api-key --data-file=-
   ```

2. **Grant access to Cloud Functions**:
   ```bash
   gcloud secrets add-iam-policy-binding sheets-service-account-key \
     --member="serviceAccount:your-project-id@appspot.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. **Update code to use Secret Manager** (requires additional implementation)

## Step 9: Update Code for Environment Variables

If using `.env`, update `functions/src/index.ts`:

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

// ... rest of your code
```

And update `functions/src/gemini.ts` and `functions/src/sheets.ts` to read from `process.env`.

## Step 10: Build and Deploy

1. **Build the functions**:
   ```bash
   cd functions
   npm run build
   ```

2. **Deploy to Firebase**:
   ```bash
   # From project root
   firebase deploy --only functions
   ```

3. **Set environment variables** (if using Secret Manager or runtime config):
   ```bash
   # For 2nd Gen Functions, set secrets:
   gcloud functions deploy analyzeReceiptUpload \
     --gen2 \
     --runtime=nodejs20 \
     --set-secrets=GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY=sheets-service-account-key:latest,GOOGLE_SHEET_ID=google-sheet-id:latest,GEMINI_API_KEY=gemini-api-key:latest
   ```

## Step 11: Verify Setup

1. **Check Function Logs**:
   ```bash
   firebase functions:log
   ```

2. **Test the Function**:
   - Upload a test receipt image to Firebase Storage at path: `receipts/test-user/receipt.jpg`
   - Check the logs for processing status
   - Verify data appears in your Google Sheet

## Troubleshooting

### Common Issues:

1. **"GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY not set"**:
   - Verify the environment variable is set correctly
   - Check that the JSON is properly escaped (no newlines in the string)

2. **"Permission denied" when writing to Sheets**:
   - Verify the Service Account email has Editor access to the Sheet
   - Check that the Sheet ID is correct

3. **"GEMINI_API_KEY not set"**:
   - Verify the API key is correct
   - Check that Generative Language API is enabled

4. **Function timeout**:
   - Increase memory allocation in `functions/src/index.ts`
   - Check that image files aren't too large

## Security Checklist

- ✅ Service Account key is NOT committed to git (in `.gitignore`)
- ✅ `.env` file is NOT committed to git
- ✅ Google Sheet is shared only with the Service Account
- ✅ Firebase Storage rules restrict uploads to authenticated users
- ✅ Firestore rules restrict batch status reads to owner

## Next Steps

Once the backend is set up, you can proceed to:
- Build the frontend PWA (Phase 4)
- Test the complete workflow
- Set up monitoring and alerts
