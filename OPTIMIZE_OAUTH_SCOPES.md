# Optimize OAuth Scopes - Security Best Practices

## ✅ Changes Made

### 1. Reduced Scope from `drive` to `drive.file`

**Before:**
```javascript
scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets'
```

**After:**
```javascript
scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets'
```

### Why This Matters:

- **`drive.file`** (Non-sensitive):
  - ✅ Only access to files **created by your app**
  - ✅ Easier to get Google verification approval
  - ✅ Better security posture
  - ✅ No security audit required

- **`drive`** (Restricted):
  - ❌ Access to **entire Google Drive** (Photos, PDFs, everything)
  - ❌ Requires expensive security audit for external users
  - ❌ Harder to get verified
  - ⚠️ Over-provisioned for our use case

### 2. Kept `spreadsheets` Scope

- **`spreadsheets`** (Sensitive but necessary):
  - ✅ Needed to edit sheets the bookkeeper creates
  - ✅ Required for formatting and data manipulation
  - ⚠️ Sensitive scope (access to all sheets)
  - ✅ Still acceptable for business use case

## 🔒 Security Implementation

### Firestore Security Rules

Created `firestore.rules` with proper security:

1. **Businesses Collection:**
   - Bookkeepers can read/write their own business
   - Authorized users (drivers) can read business details
   - Drivers **cannot** see sheet IDs directly (only via Cloud Functions)

2. **Admin SDK Protection:**
   - Cloud Functions use Admin SDK to fetch sheet IDs
   - Drivers never see or can modify sheet IDs
   - All routing happens server-side

### Security Checklist

- ✅ **Client-side writes disabled** - Drivers can't modify `activeSheetId`
- ✅ **Service Account Key** - Should be in Google Secret Manager (not in code)
- ✅ **Audit Logging** - All actions logged in Google Cloud Console
- ✅ **Scope minimization** - Using least privilege (`drive.file`)

## 📋 Next Steps

### 1. Update OAuth Consent Screen

You may need to **remove** the full `drive` scope from your OAuth consent screen:

1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=<YOUR_PROJECT_ID>
2. Click "Data Access" or "Scopes"
3. Remove `https://www.googleapis.com/auth/drive` (the restricted one)
4. Keep:
   - `https://www.googleapis.com/auth/drive.file` ✅
   - `https://www.googleapis.com/auth/spreadsheets` ✅

### 2. Deploy Firestore Rules

1. Go to: https://console.firebase.google.com/project/<YOUR_PROJECT_ID>/firestore/rules
2. Copy contents of `firestore.rules`
3. Paste into Firebase Console
4. Click **Publish**

### 3. Test the Changes

1. Clear browser cache
2. Try business signup again
3. Verify OAuth popup shows `drive.file` scope (not full `drive`)
4. Test business provisioning
5. Verify folder and sheet creation works

## ⚠️ Important Notes

### If `drive.file` Doesn't Work

If you encounter errors with `drive.file`, you might need to:
1. Create files first with `drive.file`
2. Then use `spreadsheets` to edit them
3. Or temporarily use full `drive` scope during development

### For Production

- ✅ Use `drive.file` for better security
- ✅ Get Google verification easier
- ✅ Avoid expensive security audits
- ✅ Better user trust

---

**Status**: ✅ Scopes optimized, security rules created

