# Fix: OAuth Token Issue - Service Account Can't Create Sheets

## The Problem

The service account **cannot create Google Sheets** due to 0 GB storage quota, even though:
- ✅ APIs are enabled
- ✅ Service account has Owner role
- ✅ Folder creation works (service account can create folders)

**Error**: `The caller does not have permission` when creating sheets

## Root Cause

Service accounts have a **0 GB quota** for creating files in Google Drive/Sheets. They can:
- ✅ Create folders
- ✅ Access/edit files shared with them
- ❌ **Cannot create new files** (sheets, docs, etc.)

## Solution: Use OAuth Token Instead

The code already supports OAuth tokens, but Google Identity Services (GIS) only provides an **ID token** (for Firebase Auth), not an **OAuth access token** (for Google APIs).

### Option 1: Switch to `signInWithPopup` (Recommended)

Use Firebase's `signInWithPopup` instead of Google Identity Services to get the OAuth access token:

```javascript
// Instead of GIS, use:
const result = await signInWithPopup(auth, googleProvider);
const credential = GoogleAuthProvider.credentialFromResult(result);
const googleAccessToken = credential?.accessToken; // This is what we need!
```

### Option 2: Request OAuth Token Separately

After GIS sign-in, request OAuth token separately using Google's OAuth2 flow.

### Option 3: Use Domain-Wide Delegation (Google Workspace Only)

If using Google Workspace, set up Domain-Wide Delegation so service account can impersonate users.

---

## Quick Fix: Update Code to Use signInWithPopup

I can update `business-signup.js` to use `signInWithPopup` instead of GIS, which will give us the OAuth access token needed for creating sheets.

---

## Current Status

- ✅ Folder creation works (service account can create folders)
- ❌ Sheet creation fails (service account can't create files)
- ⚠️ Code supports OAuth tokens, but we're not getting them from GIS

---

**Next Step**: Update code to use `signInWithPopup` to get OAuth access token, then pass it to the backend.

