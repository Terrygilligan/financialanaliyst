# AI Financial Analyst

A full-stack serverless application that automatically processes receipt images using AI and stores structured financial data in Google Sheets.

## 🎯 Project Overview

This application uses **Firebase Cloud Functions (2nd Gen)** to automatically:
1. Detect receipt image uploads to Firebase Storage
2. Extract structured data using **Google Gemini AI** (multimodal)
3. Validate and categorize the financial data
4. Write the results to **Google Sheets** via Service Account authentication
5. Track processing status in **Firestore**

## ✅ What's Been Completed

### Phase 1: Security and Output Preparation
- ✅ Service Account created (`financial-output@financialanaliyst.iam.gserviceaccount.com`)
- ✅ Service Account granted "Google Sheets Editor" role
- ✅ Google Sheets API enabled in GCP
- ✅ **Vertex AI API enabled in GCP** (migrated from Generative Language API)
- ✅ Cloud Function service account granted "Vertex AI User" role
- ✅ Google Sheet created with proper headers
- ✅ Sheet shared with Service Account

### Phase 2: Cloud Function Implementation
- ✅ **Storage Trigger Function** (`functions/src/index.ts`)
  - 2nd Gen Cloud Function with `onObjectFinalized` trigger
  - Filters for files in `receipts/` path
  - Handles file download and processing
  - Error handling and Firestore status updates

- ✅ **JSON Schema Definition** (`functions/src/schema.ts`)
  - TypeScript interfaces for `ReceiptData`
  - Category enum (Maintenance, Cleaning Supplies, Utilities, Supplies, Other)
  - JSON schema for Gemini structured output

- ✅ **Vertex AI Integration** (`functions/src/gemini.ts`)
  - **Migrated to Vertex AI SDK** (`@google-cloud/vertexai`)
  - Uses Application Default Credentials (Service Account)
  - Multimodal AI processing using `gemini-1.5-flash`
  - Image-to-JSON extraction with validation
  - Category normalization and error handling

- ✅ **Data Processing** (`functions/src/processor.ts`)
  - Orchestrates receipt analysis workflow
  - Validates extracted data
  - Handles file size limits and errors

### Phase 3: Data Pipeline
- ✅ **Google Sheets Authentication** (`functions/src/sheets.ts`)
  - Service Account authentication using `googleapis`
  - Secure credential handling from environment variables

- ✅ **Sheets Data Writing** (`functions/src/sheets.ts`)
  - Appends receipt data to Google Sheets
  - Maps data to correct columns
  - Header validation function

- ✅ **Status Tracking**
  - Firestore documents for batch processing status
  - Status values: `processing`, `complete`, `error`
  - Includes error messages and timestamps

### Phase 4: Client-Facing PWA (Frontend)
- ✅ **Authentication System** (`public/login.html`, `public/login.js`)
  - Email/Password authentication
  - Google Sign-In integration
  - Email verification with resend functionality
  - Show/hide password toggle
  - Redirects unverified users to login page

- ✅ **Main Application UI** (`public/index.html`, `public/app.js`)
  - Modern, responsive PWA design
  - File upload with drag-and-drop support
  - Real-time upload progress tracking
  - Firestore status monitoring (real-time updates)
  - Upload history display
  - User authentication state management

- ✅ **PWA Configuration**
  - `manifest.json` configured for add-to-home-screen
  - Mobile-optimized viewport settings
  - App icons and branding

- ✅ **Firebase Hosting**
  - Hosting configured in `firebase.json`
  - SPA routing with rewrites
  - Cache headers for performance

### Phase 5: Security & Rules
- ✅ **Firebase Storage Security Rules**
  - Authenticated users only
  - Path restriction: `receipts/{userId}/{fileName}`
  - Read/write permissions for own files

- ✅ **Firestore Security Rules**
  - Users can read/write only their own `/batches/{userId}` documents
  - Prevents unauthorized access

### Phase 6: Configuration & Deployment
- ✅ Environment variables configured (`.env` file)
  - Google Sheets Service Account key
  - Google Sheet ID
- ✅ Project structure set up
- ✅ TypeScript configuration
- ✅ Dependencies installed
- ✅ **Function deployed to Firebase** ✅
- ✅ **Frontend deployed to Firebase Hosting** ✅

## 📁 Project Structure

```
financialAnalyst/
├── functions/
│   ├── src/
│   │   ├── index.ts          # Main Cloud Function entry point
│   │   ├── schema.ts          # Data types and JSON schema
│   │   ├── gemini.ts          # Vertex AI integration
│   │   ├── processor.ts      # Data validation and processing
│   │   └── sheets.ts          # Google Sheets API client
│   ├── lib/                   # Compiled JavaScript (generated)
│   ├── .env                   # Environment variables (not in git)
│   ├── package.json
│   └── tsconfig.json
├── public/                    # Frontend PWA files
│   ├── index.html            # Main application page
│   ├── login.html            # Login/signup page
│   ├── app.js                # Main application logic
│   ├── login.js              # Authentication logic
│   ├── firebase-config.js    # Firebase web app config
│   ├── styles.css            # Application styles
│   └── manifest.json         # PWA manifest
├── .gitignore                 # Excludes .env and keys
├── firebase.json              # Firebase configuration
├── README.md                  # This file
├── TODO.md                    # Next steps and improvements
└── Documentation files:
    ├── SETUP.md               # Detailed setup guide
    ├── ENV_SETUP.md           # Environment variables guide
    ├── VERTEX_AI_SETUP.md     # Vertex AI setup guide
    ├── AUTHENTICATION_SETUP.md # Auth setup guide
    ├── HOSTING_SETUP.md       # Hosting setup guide
    └── Various troubleshooting guides
```

## 🔧 Configuration

### Environment Variables

The following environment variables are configured in `functions/.env`:

- `GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY` - Service Account JSON key (as string)
- `GOOGLE_SHEET_ID` - Target Google Sheet ID

**Note**: Vertex AI uses Application Default Credentials (Service Account), so no API key is needed. The Cloud Function's service account must have the "Vertex AI User" role.

### Google Sheet Configuration

**Sheet ID**: `1gc-R5cKCOVFnnC0EsVJ_OIDXP-PIQ_pWcssr-HJujos`

**Headers** (Row 1):
- Vendor Name
- Date
- Total Amount
- Category
- Timestamp

**Service Account**: `financial-output@financialanaliyst.iam.gserviceaccount.com`

## 🚀 How It Works

1. **Authentication**: User logs in via email/password or Google Sign-In (email verification required)
2. **Upload**: User uploads receipt image through the web app to Firebase Storage at path `receipts/{userId}/{filename}`
3. **Trigger**: Cloud Function automatically triggers on file upload
4. **Process**: 
   - Function downloads the image
   - Sends to Vertex AI (Gemini 1.5 Flash) for extraction
   - Validates and structures the data
5. **Output**:
   - Writes to Google Sheets
   - Updates Firestore status document
6. **Result**: 
   - Structured financial data appears in Google Sheet
   - User sees real-time status updates in the web app

## 📊 Data Flow

```
User Login (Email/Password or Google)
    ↓
Receipt Image Upload (via PWA)
    ↓
Firebase Storage (receipts/{userId}/file.jpg)
    ↓
Cloud Function Trigger (analyzeReceiptUpload)
    ↓
Vertex AI Processing (Gemini 1.5 Flash)
    ↓
Data Validation (processReceiptBatch)
    ↓
Google Sheets API (appendReceiptToSheet)
    ↓
Firestore Status Update
    ↓
Real-time UI Update (via Firestore listener)
    ↓
Complete! ✓
```

## 🔒 Security

- ✅ Service Account keys stored in environment variables (not in code)
- ✅ `.env` file excluded from git (`.gitignore`)
- ✅ Service Account has minimal required permissions
- ✅ Firebase Storage security rules configured (authenticated users only)
- ✅ Firestore security rules configured (users can only access their own data)
- ✅ Email verification required for account access
- ✅ Vertex AI uses Service Account authentication (no API keys exposed)

## 📝 Current Status

**Backend**: ✅ Fully deployed and operational
**Frontend**: ✅ Fully deployed and operational
**Authentication**: ✅ Email/Password + Google Sign-In with verification
**AI Processing**: ✅ Vertex AI (Gemini 1.5 Flash) integrated
**Status**: 🚀 **Ready for production use!**

## 🧪 Testing

To test the application:

1. **Access the app**: Visit your Firebase Hosting URL (e.g., `https://financialanaliyst.web.app`)

2. **Login/Signup**:
   - Create an account with email/password (verify email)
   - Or use Google Sign-In

3. **Upload a receipt**:
   - Click "Choose File" or drag-and-drop
   - Select a receipt image (JPG, PNG, etc.)
   - Watch the upload progress and status updates

4. **Monitor results**:
   - Check real-time status in the app
   - View logs: `firebase functions:log --project financialanaliyst`
   - Check Google Sheet for new row with extracted data
   - Firestore document at `/batches/{userId}` shows status

## 📚 Documentation

- **SETUP.md** - Complete backend setup instructions
- **ENV_SETUP.md** - Environment variables configuration
- **NEXT_STEPS.md** - Google Sheet setup guide
- **BACKEND_SETUP_CHECKLIST.md** - Quick setup checklist

## 🛠️ Development

### Build
```bash
cd functions
npm run build
```

### Deploy
```bash
firebase deploy --only functions --project financialanaliyst
```

### View Logs
```bash
firebase functions:log --project financialanaliyst
```

## 📦 Dependencies

**Backend (functions/)**:
- `firebase-admin` - Firebase Admin SDK
- `firebase-functions` - Cloud Functions SDK (2nd Gen)
- `@google-cloud/vertexai` - Vertex AI SDK (Gemini)
- `googleapis` - Google Sheets API
- `dotenv` - Environment variable management

**Frontend (public/)**:
- Firebase Client SDKs (Auth, Storage, Firestore)
- Vanilla JavaScript (ES6 modules)
- Progressive Web App (PWA) capabilities

## 🌐 Firebase Project

**Project ID**: `financialanaliyst`  
**Region**: `us-central1`  
**Storage Bucket**: `financialanaliyst.firebasestorage.app`

## 📞 Support

For issues or questions, refer to:
- Setup documentation in `SETUP.md`
- Environment configuration in `ENV_SETUP.md`
- Next steps in `TODO.md`

---

**Last Updated**: Full-stack application deployed and operational. Vertex AI integration complete.
