# Troubleshoot OAuth 403 Error - Detailed Steps

## Step-by-Step Fix

### 1. Verify You're Adding the Correct Email

**Important**: The email must match EXACTLY what you use to sign in with Google.

1. Check which email you're using:
   - When you click "Sign in with Google", note which Google account appears
   - That's the email you need to add

### 2. Add Test User in Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=<YOUR_PROJECT_ID>
2. Make sure you're logged in with the correct Google account (the project owner)
3. Scroll down to **"Test users"** section
4. Click **"+ ADD USERS"**
5. **Enter the EXACT email** you use to sign in (case-sensitive)
6. Click **"ADD"**
7. **Verify it appears in the list** below

### 3. Check OAuth Consent Screen Settings

Make sure:
- **User Type**: "External" (for personal Gmail) or "Internal" (for Google Workspace)
- **Publishing status**: "Testing" (this is fine for now)
- **Scopes**: Should include:
  - `https://www.googleapis.com/auth/drive`
  - `https://www.googleapis.com/auth/spreadsheets`
  - `openid`
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`

### 4. Clear Browser Cache

Sometimes cached OAuth data causes issues:

1. Clear browser cache and cookies for:
   - `localhost:5000`
   - `accounts.google.com`
   - `<YOUR_PROJECT_ID>.firebaseapp.com`
2. Try in an incognito/private window

### 5. Verify Email Format

Make sure you're adding:
- ✅ Full email address: `yourname@gmail.com`
- ❌ NOT just the username: `yourname`
- ❌ NOT with extra spaces

### 6. Wait a Few Seconds

After adding the test user, wait 10-30 seconds before trying again (Google needs to sync).

---

## Alternative: Check Current Test Users

1. Go to OAuth consent screen
2. Scroll to "Test users"
3. **Verify your email is in the list**
4. If it's not there, add it again
5. If it is there, try removing and re-adding it

---

## Still Not Working?

### Option 1: Try Different Email

If you have multiple Google accounts, try:
1. Add a different email as test user
2. Sign in with that account instead

### Option 2: Check Project Permissions

Make sure you have:
- **Owner** or **Editor** role on the Google Cloud project
- Access to modify OAuth consent screen

### Option 3: Verify OAuth Client ID

The error shows:
- `client_id: <YOUR_PROJECT_NUMBER>-lg45lavoa57dvh31qrai4mbtshck73vq.apps.googleusercontent.com`

Make sure this matches your Firebase project's OAuth client ID:
1. Go to Firebase Console → Project Settings → General
2. Check "Your apps" → Web app → OAuth client ID
3. Should match the one in the error

---

## Quick Checklist

- [ ] Added email to "Test users" in OAuth consent screen
- [ ] Email matches exactly what you use to sign in
- [ ] Waited 10-30 seconds after adding
- [ ] Cleared browser cache
- [ ] Tried in incognito window
- [ ] Verified email appears in test users list
- [ ] Checked OAuth scopes are correct

---

**Next Step**: Double-check that your email is in the test users list and matches exactly.

