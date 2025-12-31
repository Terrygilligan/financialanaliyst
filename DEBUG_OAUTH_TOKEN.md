# Debug OAuth Token Issue

## Current Error
```
Error provisioning business: FirebaseError: Failed to provision business: Invalid Credentials
```

## What We've Done
1. ✅ Added Functions emulator connection
2. ✅ Added Auth emulator connection  
3. ✅ Simplified OAuth2 client setup
4. ✅ Added better error handling

## Next Steps to Debug

### 1. Check Browser Console
Open browser console (F12) and look for:
- Token length when extracted
- Any errors during token extraction

### 2. Check Function Logs
In the emulator terminal, look for:
- `[Business Provisioning] Using OAuth token (length: XXX)`
- Any error details from Google API

### 3. Verify Token Scopes
The token needs these scopes:
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/spreadsheets`

### 4. Test Token Directly
Try using the token in a test script to see if it's valid.

---

## Possible Issues

1. **Token Expired**: Firebase Auth tokens might expire quickly
2. **Missing Scopes**: Token might not have Drive/Sheets scopes
3. **Token Format**: Firebase Auth token might not be compatible with googleapis

---

## Solution: Get Fresh Token

The token from Firebase Auth might be a Firebase ID token, not a Google OAuth token. We might need to:
1. Request a fresh Google OAuth token with the right scopes
2. Or use Firebase's token exchange to get a Google token

---

**Status**: Need to check if token is valid and has correct scopes

