# Fix OAuth App Verification Error

## Error
Google is showing: "app_notverified" - This means your OAuth app needs to be configured for testing.

## Solution: Configure OAuth Consent Screen

### Step 1: Go to OAuth Consent Screen
1. Open: https://console.cloud.google.com/apis/credentials/consent?project=financialanaliyst
2. Or: Google Cloud Console > APIs & Services > OAuth consent screen

### Step 2: Configure App Information
1. **User Type**: Select "External" (unless you have Google Workspace)
2. **App name**: Enter "Financial Analyst" (or your app name)
3. **User support email**: Your email
4. **Developer contact information**: Your email
5. Click **SAVE AND CONTINUE**

### Step 3: Add Scopes
1. Click **ADD OR REMOVE SCOPES**
2. Search for and add:
   - `https://www.googleapis.com/auth/drive` (Google Drive API)
   - `https://www.googleapis.com/auth/spreadsheets` (Google Sheets API)
3. Click **UPDATE**
4. Click **SAVE AND CONTINUE**

### Step 4: Add Test Users
1. Under **Test users**, click **+ ADD USERS**
2. Add your email address (the one you use to sign in)
3. Click **ADD**
4. Click **SAVE AND CONTINUE**

### Step 5: Summary
- Review the configuration
- Click **BACK TO DASHBOARD**

## Important Notes

### For Testing (Current Setup)
- ✅ App is in "Testing" mode
- ✅ Only test users can sign in
- ✅ No verification needed for testing

### For Production
- ⚠️ App must be verified by Google
- ⚠️ Requires privacy policy, terms of service
- ⚠️ Can take several days for verification

## After Configuration

1. **Wait 5-10 minutes** for changes to propagate
2. **Clear browser cache** or use incognito mode
3. **Try again** on http://localhost:5000/business-signup.html

## If Still Not Working

Check:
- ✅ Your email is in test users list
- ✅ Scopes are added (Drive, Sheets)
- ✅ OAuth client ID is correct: `622000096460-lg45lavoa57dvh31qrai4mbtshck73vq.apps.googleusercontent.com`
- ✅ App is in "Testing" mode (not "In production")

---

**Status**: Configure OAuth consent screen with Drive and Sheets scopes

