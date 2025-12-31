# Fix: Service Account Identity Crisis (403 Error)

## The Problem

Even with Owner role granted, you're getting "The caller does not have permission" because:
- Cloud Functions v2 run as the **default Compute Engine service account** by default
- The Google API client uses credentials from env var, but the **function runtime identity** might be different

## Solution 1: Explicit Service Account in Function Definition

For Firebase Functions v2, you can specify the service account the function should run as:

```typescript
export const createNewGoogleSheet = onCall(
  { 
    region: "us-central1",
    // Add this to use the custom service account
    serviceAccount: "financial-output@financialanaliyst.iam.gserviceaccount.com"
  },
  async (request) => {
    // ... function code
  }
);
```

**However**: This only affects the function's runtime identity for accessing other GCP services. The Google API client already uses explicit credentials, so this might not be necessary.

## Solution 2: Verify Credentials Are Loaded

The code in `sheet-operations.ts` explicitly uses credentials from the env var:

```typescript
const auth = new google.auth.GoogleAuth({
    credentials: credentials, // Explicit credentials from env var
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
    ],
});
```

This should work regardless of the function's runtime identity.

## Solution 3: Check Google Cloud Logs

To see who Google thinks is calling:

1. Go to: https://console.cloud.google.com/logs/query?project=financialanaliyst
2. Filter: `protoPayload.status.code="7"` (Permission Denied)
3. Look for `principalEmail` in the log entry
4. This tells you which identity is actually making the call

## Solution 4: Grant Permissions to Default Compute SA (Quick Fix)

If the function is using the default Compute Engine service account:

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=financialanaliyst
2. Find: `622000096460-compute@developer.gserviceaccount.com` (or similar)
3. Grant it **Editor** or **Owner** role
4. This allows the function runtime to create resources

## Solution 5: Use Application Default Credentials (ADC)

Instead of explicit credentials, use ADC with the service account:

1. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
2. Or use `gcloud auth activate-service-account`
3. The Google Auth client will automatically use ADC

## Current Status

The code uses **explicit credentials** from the env var, which should work. The 403 error might be:
1. **Permissions not propagated yet** (wait 10-20 minutes)
2. **Wrong credentials in env var** (verify the key is correct)
3. **API not enabled** (verify Google Drive API is enabled)

## Next Steps

1. **Test in production** (deployed now) - see if it works
2. **Check Cloud Logs** to see which identity is calling
3. **If still failing**, add `serviceAccount` option to function definitions
4. **Or grant Editor role to default Compute Engine SA** as a workaround

---

**Most likely**: The explicit credentials should work. The 403 might be due to permissions not fully propagated or the Drive API not being enabled for the service account's project.

