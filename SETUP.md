# Backend Setup Guide

This guide walks you through setting up the AI Financial Analyst backend using Multi-Tenant Firestore silos.

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
   - Install dependencies now (yes)

## Step 2: Install Dependencies

```bash
cd functions
npm install
```

## Step 3: Enable Required APIs

Enable these APIs in your GCP project:

1. Go to [GCP Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Enabled APIs & Services**
3. Click **+ ENABLE APIS AND SERVICES**
4. Enable:
   - **Generative Language API** (for Gemini)
   - **Vertex AI API** (optional, for production)

## Step 4: Configure Environment Variables

1. **Create `.env` file** in the `functions/` directory:
   ```bash
   cd functions
   touch .env
   ```

2. **Add environment variables**:
   ```env
   GEMINI_API_KEY=your-gemini-api-key-here
   BASE_CURRENCY=GBP
   ENABLE_REVIEW_WORKFLOW=true
   ```

## Step 5: Build and Deploy

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

## Step 6: Verify Setup

1. **Check Function Logs**:
   ```bash
   firebase functions:log
   ```

2. **Test the Function**:
   - Upload a test receipt image to Firebase Storage at path: `tenants/{businessId}/drivers/{uid}/receipts/receipt.jpg`
   - Check the logs for processing status
   - Verify data appears in the business silo: `/businesses/{businessId}/receipts/`

## Security Checklist

- ✅ Gemini API key is NOT committed to git (in `.gitignore`)
- ✅ `.env` file is NOT committed to git
- ✅ Firebase Storage rules restrict uploads to tenant silos
- ✅ Firestore rules enforce total data isolation between businesses

## Next Steps

Once the backend is set up, you can proceed to:
- Configure Identity Platform for tenant-aware auth
- Set up the Field Builder for custom extraction fields
- Invite drivers to your business silo
