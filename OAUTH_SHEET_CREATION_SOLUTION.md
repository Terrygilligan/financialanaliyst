# OAuth Solution: Create Sheets in User's Drive

## Problem
Service accounts cannot create files due to 0 GB storage quota, even in shared folders.

## Solution
Use **OAuth 2.0** to get the user's Google access token and create sheets in **their Drive** (which has 15GB quota).

## How It Works

1. **User signs in with Google** (already implemented)
2. **Frontend gets Google OAuth token** from Firebase Auth
3. **Frontend passes token to Cloud Function**
4. **Backend uses token to create sheets** in user's Drive
5. **Service account can still access/edit** the sheets

## Implementation Steps

### Step 1: Get Google OAuth Token from Firebase Auth

When user signs in with Google, Firebase Auth provides the Google OAuth token. We need to extract it.

### Step 2: Pass Token to Cloud Function

Update the admin UI to get the token and pass it when creating sheets.

### Step 3: Use Token in Backend

Update `sheet-operations.ts` to accept and use OAuth token instead of service account when provided.

## Benefits

- ✅ Works with personal Google accounts
- ✅ Uses user's 15GB Drive quota
- ✅ No need for Google Workspace upgrade
- ✅ Sheets created in user's Drive automatically
- ✅ Service account can still access/edit (via sharing)

## Security

- OAuth tokens are passed securely via HTTPS
- Tokens are only used for sheet creation
- User must be authenticated to create sheets
- Tokens are not stored permanently


