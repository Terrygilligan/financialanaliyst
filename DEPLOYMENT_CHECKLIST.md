# Deployment Checklist - December 17, 2025

## Pre-Deployment Verification

### Code Status
- ✅ All changes committed
- ✅ TypeScript compiled successfully
- ✅ No linter errors
- ✅ Feature branch: `feature/phase-2-categories`
- ✅ Latest commit: `f52562c - Fix: Add cache-busting and fix currency metadata bugs`

### Environment Configuration
- [ ] Firebase project: `financialanaliyst`
- [ ] Google Sheets API enabled
- [ ] Service account has Editor access to sheets
- [ ] Environment variables set in Functions config:
  ```bash
  firebase functions:config:get
  ```
  Check for:
  - `google.sheet_id`
  - `google.base_currency` (optional, defaults to GBP)

### Security
- [ ] Firestore security rules published
- [ ] Admin users configured in `/admins` collection
- [ ] Service account credentials secure

---

## Deployment Steps

### Step 1: Build Functions
```powershell
cd C:\Users\terry\Desktop\financialAnalyst\functions
npm run build
cd ..
```

### Step 2: Deploy (Choose One)

**Full Deployment (Hosting + Functions):**
```powershell
firebase deploy
```

**Hosting Only (Public files, faster):**
```powershell
firebase deploy --only hosting
```

**Functions Only:**
```powershell
firebase deploy --only functions
```

---

## Post-Deployment Testing

### 1. Test User Functionality
- [ ] Navigate to production URL
- [ ] Sign up / Log in
- [ ] Upload a receipt
- [ ] Review receipt data
- [ ] Finalize receipt
- [ ] Check Google Sheet for data

### 2. Test Admin Functionality
- [ ] Log in as admin user
- [ ] Verify "Admin" link appears in nav
- [ ] Access admin dashboard
- [ ] View system statistics
- [ ] Check error logs
- [ ] Review pending receipts (if any)
- [ ] Test quick navigation icons

### 3. Check Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)
- [ ] Mobile browser (responsive design)

### 4. Monitor Cloud Functions
```powershell
# View function logs
firebase functions:log

# Or via Firebase Console:
# Functions → Logs
```

### 5. Check for Errors
- [ ] Browser console (F12) - no errors
- [ ] Firebase Console → Functions → Logs - no errors
- [ ] Admin dashboard → Error Logs section - no new errors

---

## Rollback Plan (If Needed)

### Quick Rollback via Firebase Console
1. Go to Firebase Console → Hosting → Release History
2. Find previous stable deployment
3. Click **⋮** → **Rollback**

### Emergency Function Disable
```powershell
# If a specific function is causing issues
firebase functions:delete functionName
```

### Full Git Rollback
```powershell
# 1. Checkout previous stable commit
git log --oneline
git checkout <stable-commit-hash>

# 2. Redeploy
firebase deploy

# 3. Create rollback branch (for tracking)
git checkout -b rollback/dec17-emergency
git push origin rollback/dec17-emergency
```

---

## Known Issues to Monitor

### Cache-Related
- Admin link may not appear until hard refresh (Ctrl+Shift+F5)
- Cache-busting implemented (`?v=20251217`)
- If issues persist, increment version number

### Currency Metadata
- New receipts should have complete currency data
- Check `originalCurrency` field is populated when `exchangeRate=1.0`

### Receipt Data Validation
- Monitor for any "Missing receiptData" errors in logs
- Should be caught gracefully with clear error messages

---

## Success Criteria

✅ **Deployment Successful If:**
- Users can upload and process receipts
- Data appears correctly in Google Sheets
- Admin dashboard loads without errors
- No critical errors in Cloud Functions logs
- Browser console shows no JavaScript errors
- Admin link appears for admin users (after hard refresh)

🚨 **Rollback Immediately If:**
- Users cannot upload receipts
- Data is not written to Google Sheets
- Critical errors in Cloud Functions logs
- Admin dashboard completely broken
- Security rules preventing normal operations

---

## Support & Documentation

- **User Guide**: `USER_GUIDE.md`
- **Admin Guide**: `ADMIN_GUIDE.md`
- **Bug Fixes**: `BUG_FIXES_DEC17_2025.md`, `BUG_FIX_*.md`
- **Local Testing**: `LOCAL_TESTING_GUIDE.md`
- **Stakeholder Signup**: `STAKEHOLDER_SIGNUP_GUIDE.md`

---

## Deployment Log

| Date | Time | Version | Deployed By | Status | Notes |
|------|------|---------|-------------|--------|-------|
| Dec 17, 2025 | ___ | f52562c | Terry | ⏳ Pending | Cache-busting + currency fixes |

---

**Deployed By**: ___________________  
**Deployment Time**: ___________________  
**Production URL**: ___________________  
**Rollback Plan Reviewed**: [ ] Yes  
**Stakeholders Notified**: [ ] Yes

