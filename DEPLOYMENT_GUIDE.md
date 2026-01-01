# Deployment Guide

This guide covers deploying the Financial Analyst application to Firebase production.

## Prerequisites

1. **Firebase CLI installed**: `npm install -g firebase-tools`
2. **Logged in to Firebase**: `firebase login`
3. **Project selected**: `firebase use <YOUR_PROJECT_ID>` (or your project ID)

## Pre-Deployment Checklist

### 1. Set Up Firebase Secret Manager

Move sensitive environment variables to Firebase Secret Manager:

```bash
# Set Gemini API key (if using direct API instead of Vertex AI)
# Note: Vertex AI uses service account, so this may not be needed
firebase functions:secrets:set GEMINI_API_KEY
```

**Important**: After setting secrets, you must redeploy functions for them to take effect.

### 2. Update OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** > **OAuth consent screen**
3. Add required information:
   - Privacy Policy URL (required for production)
   - Terms of Service URL (required for production)
4. Submit for verification if using sensitive scopes

### 3. Verify Environment Variables

Non-sensitive config can remain in `.env` or be set via Firebase Functions config:

```bash
# Set non-sensitive config
firebase functions:config:set base_currency="GBP"
```

## Deployment Steps

### Option 1: Use Deployment Script (Recommended)

```bash
# Make script executable (Linux/Mac)
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Option 2: Manual Deployment

```bash
# 1. Build functions
cd functions
npm run build
cd ..

# 2. Deploy Firestore rules
firebase deploy --only firestore:rules

# 3. Deploy functions (with secrets)
firebase deploy --only functions

# 4. Deploy hosting
firebase deploy --only hosting
```

### Option 3: Deploy Everything at Once

```bash
firebase deploy
```

## Post-Deployment Verification

### 1. Test Business Signup

1. Visit your hosting URL: `https://<YOUR_PROJECT_ID>.web.app/business-signup.html`
2. Create a test business
3. Verify:
   - Secure Firestore silo created for the business
   - Business document in Firestore under `/businesses/{businessId}`

### 2. Test Receipt Processing

1. Upload a test receipt
2. Verify:
   - Receipt processed successfully
   - Data appears in the business silo: `/businesses/{businessId}/receipts/`
   - Firestore status updates correctly

### 3. Check Function Logs

```bash
# View recent logs
firebase functions:log

# Follow logs in real-time
firebase functions:log --follow
```

### 4. Verify Multi-Tenant Security

1. Create multiple test businesses
2. Verify receipts route to correct business silos
3. Test that users can only access their own business data

## Troubleshooting

### Functions Fail to Deploy

**Error**: "Secret not found"
- **Solution**: Make sure secrets are set (e.g., `GEMINI_API_KEY` if using direct API)

**Error**: "Permission denied"
- **Solution**: Check IAM permissions in Google Cloud Console
- Ensure service account has required roles

### Functions Deploy but Fail at Runtime

**Error**: "Rate limit exceeded" (429)
- **Solution**: Retry logic is already implemented in `gemini.ts`. Check logs for retry attempts.

### OAuth Errors

**Error**: "OAuth consent screen not configured"
- **Solution**: Complete OAuth consent screen setup in Google Cloud Console
- Add privacy policy and terms of service URLs

## Rollback

If deployment fails, you can rollback:

```bash
# View deployment history
firebase functions:log

# Redeploy previous version (if needed)
# Note: Firebase doesn't have built-in rollback, but you can redeploy from git
git checkout <previous-commit>
firebase deploy --only functions
```

## Monitoring

### Set Up Alerts

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **Monitoring** > **Alerting**
3. Create alerts for:
   - Function errors
   - High latency
   - Rate limit errors

### View Metrics

```bash
# Function execution metrics
firebase functions:log --only analyzeReceiptUpload

# Check function status
firebase functions:list
```

## Security Checklist

- [ ] Secrets moved to Firebase Secret Manager
- [ ] OAuth consent screen configured
- [ ] Firestore security rules deployed
- [ ] Storage security rules deployed
- [ ] Service account has minimal required permissions
- [ ] Multi-tenant isolation verified

## Next Steps

After successful deployment:

1. Monitor function logs for errors
2. Test with real users
3. Set up monitoring and alerts
4. Review costs in Firebase Console
5. Document any production-specific configurations

