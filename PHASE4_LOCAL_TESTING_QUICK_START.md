# Phase 4: Local Testing - Quick Start Guide

**Goal**: Test Phase 4 features locally before deploying to hosting

---

## 🚀 Step 1: Start Emulators

```bash
# From project root
firebase emulators:start
```

**What this starts**:
- ✅ Functions Emulator: http://127.0.0.1:5001
- ✅ Firestore Emulator: http://127.0.0.1:8080
- ✅ Auth Emulator: http://127.0.0.1:9099
- ✅ Storage Emulator: http://127.0.0.1:9199
- ✅ Hosting Emulator: http://127.0.0.1:5000
- ✅ Emulator UI: http://127.0.0.1:4000

---

## ⚙️ Step 2: Configure Environment Variables

Make sure `functions/.env` exists and has:

```env
GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GOOGLE_SHEET_ID=your-test-sheet-id
BASE_CURRENCY=GBP
ENABLE_REVIEW_WORKFLOW=true
```

**Note**: For local testing, you'll use **real Google Sheets** (emulators don't mock Google Sheets API). Make sure your test sheets are shared with the service account.

---

## 👤 Step 3: Set Up Admin Access

### Quick Method (Emulator UI)

1. **Sign up** as a user at http://127.0.0.1:5000
2. Go to **Emulator UI**: http://127.0.0.1:4000
3. Click **"Authentication"** tab
4. Find your user → Click **3 dots** (⋮) → **"Set custom user claims"**
5. Enter: `{ "admin": true }`
6. Click **"Save"**
7. **Refresh** your app page
8. You should now see **"Admin Dashboard"** link!

---

## 🧪 Step 4: Test Phase 4 Features

### Test Sheet Management Page

1. Go to http://127.0.0.1:5000/admin-sheets.html
2. Should see "No sheet configurations found" (if none exist)
3. Click **"+ Create New Sheet Config"**

### Create Sheet Config

1. Select **"Use existing Google Sheet"**
2. Enter:
   - Name: "Test Sheet 1"
   - Sheet ID: (from your test sheet URL)
   - Default: Checked
3. Click **"Verify Sheet"** → Should show ✅
4. Click **"Save Configuration"**
5. Should see success message and new config in list

### Test Sheet Routing

1. **Assign sheet to user**:
   - Click **"👥 Assign"** on a config
   - Go to "Assign to Users" tab
   - Select a user
   - Click "Assign Selected Users"

2. **Upload receipt as that user**:
   - Log in as the assigned user
   - Upload a receipt
   - Check which sheet receives it

3. **Verify routing**:
   - Check Google Sheet for new receipt
   - Check logs in terminal for routing path

---

## 🔍 Quick Verification

### Check Firestore Data

1. Go to Emulator UI: http://127.0.0.1:4000
2. Click **"Firestore"** tab
3. Check collections:
   - `sheet_configs` - Your sheet configurations
   - `users` - User sheet assignments (`sheetConfigId` field)
   - `entities` - Entity sheet assignments (`sheetConfigId` field)

### Check Function Logs

In terminal running emulators, look for:
```
[Admin Sheet] Creating new config: ...
[Sheet Config] Looking up sheet config for user: ...
[Multi-Sheet] Using sheet: ... (config: ...)
```

---

## 📋 Quick Test Checklist

- [ ] Emulators running
- [ ] Admin custom claim set
- [ ] Can access Sheet Management page
- [ ] Can create sheet config
- [ ] Sheet health check works
- [ ] Can assign sheet to user/entity
- [ ] Receipt routes to correct sheet
- [ ] Statistics update after receipt write

---

## 🐛 Common Issues

**"User must be an admin" Error**:
- ✅ Set admin custom claim (see Step 3)
- ✅ Refresh page after setting claim

**Sheet Health Check Fails**:
- ✅ Verify sheet is shared with service account
- ✅ Check sheet ID is correct

**Functions Not Found**:
- ✅ Make sure emulators are running
- ✅ Build functions: `cd functions && npm run build`

---

## 📚 Full Testing Guide

For comprehensive testing, see:
- **[PHASE4_LOCAL_TESTING.md](PHASE4_LOCAL_TESTING.md)** - Detailed test cases
- **[LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md)** - General local testing

---

## ✅ Next Steps

After local testing passes:
1. Fix any issues found
2. Deploy to staging (if available)
3. Deploy to production

---

**Happy Testing!** 🎉

