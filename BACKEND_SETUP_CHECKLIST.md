# Backend Setup Checklist

Quick reference checklist for setting up the backend.

## ✅ Prerequisites
- [ ] Node.js 20+ installed
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Firebase project created
- [ ] Logged into Firebase CLI (`firebase login`)

## ✅ Firebase Configuration
- [ ] Firebase project initialized (`firebase init functions`)
- [ ] Dependencies installed (`cd functions && npm install`)
- [ ] Storage bucket name updated in `functions/src/index.ts` (line 24)

## ✅ GCP APIs Enabled
- [ ] Google Sheets API enabled
- [ ] Generative Language API enabled (for Gemini)

## ✅ Service Account Setup
- [ ] Service Account created in GCP Console
- [ ] Service Account granted "Google Sheets Editor" role
- [ ] JSON key file downloaded (e.g., `sheets-writer-key.json`)
- [ ] Service Account email copied (for sharing Google Sheet)

## ✅ Google Sheet Setup
- [ ] New Google Sheet created
- [ ] Headers added (Row 1): `Vendor Name | Date | Total Amount | Category | Timestamp`
- [ ] Sheet shared with Service Account email (Editor access)
- [ ] Sheet ID extracted from URL

## ✅ Gemini API Key
- [ ] API key created at [Google AI Studio](https://aistudio.google.com/app/apikey)
- [ ] OR Vertex AI User role granted to Cloud Function

## ✅ Environment Variables
Choose one method:

### Option A: .env File (Local Development)
- [ ] `.env` file created in `functions/` directory
- [ ] `GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY` set (JSON as string)
- [ ] `GOOGLE_SHEET_ID` set
- [ ] `GEMINI_API_KEY` set
- [ ] `GEMINI_MODEL` set (optional, defaults to gemini-1.5-flash)

### Option B: Secret Manager (Production)
- [ ] Secrets created in GCP Secret Manager
- [ ] Cloud Function service account granted Secret Accessor role
- [ ] Secrets configured in function deployment

## ✅ Code Updates
- [ ] `dotenv` package installed (`npm install dotenv` in functions/)
- [ ] `.env` loading added to `functions/src/index.ts` (already done)

## ✅ Build & Deploy
- [ ] Code builds successfully (`npm run build` in functions/)
- [ ] Function deployed (`firebase deploy --only functions`)
- [ ] Environment variables configured (if using Secret Manager)

## ✅ Testing
- [ ] Test receipt uploaded to Storage path: `receipts/test-user/receipt.jpg`
- [ ] Function logs checked (`firebase functions:log`)
- [ ] Data verified in Google Sheet
- [ ] Firestore status document checked

## 🔒 Security Verification
- [ ] Service Account key file in `.gitignore`
- [ ] `.env` file in `.gitignore`
- [ ] No secrets committed to git
- [ ] Storage rules configured (authenticated users only)
- [ ] Firestore rules configured (user can only read own batches)

---

## Quick Command Reference

```bash
# Install dependencies
cd functions && npm install

# Build
npm run build

# Deploy
firebase deploy --only functions

# View logs
firebase functions:log

# Test locally (requires emulator)
npm run serve
```

## Environment Variables Format

For `.env` file:
```env
GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
GOOGLE_SHEET_ID=abc123xyz
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-1.5-flash
```

**Note**: The Service Account JSON must be a single-line string (no newlines).
