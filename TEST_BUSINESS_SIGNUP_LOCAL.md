# Test Business Signup Locally with Emulators

## ✅ Yes, You Can Test Locally!

The business signup functions work with Firebase emulators. Here's how to test them locally.

---

## 🚀 Quick Start

### Step 1: Build Functions

The functions need to be built before the emulator can run them:

```bash
cd functions
npm run build
cd ..
```

### Step 2: Start Emulators

```bash
firebase emulators:start
```

This starts:
- ✅ **Functions Emulator**: http://localhost:5001
- ✅ **Firestore Emulator**: http://localhost:8080
- ✅ **Auth Emulator**: http://localhost:9099
- ✅ **Storage Emulator**: http://localhost:9199
- ✅ **Hosting Emulator**: http://localhost:5000
- ✅ **Emulator UI**: http://localhost:4000

### Step 3: Enable Emulator Mode

Open the business signup page with emulator mode enabled:

**Option A: URL Parameter (Recommended)**
```
http://localhost:5000/business-signup.html?emulator=true
```

**Option B: localStorage**
1. Open browser console (F12)
2. Run: `localStorage.setItem('useEmulator', 'true')`
3. Refresh the page

### Step 4: Test Business Signup

1. Go to: `http://localhost:5000/business-signup.html?emulator=true`
2. Enter a business name
3. Click "Sign in with Google"
4. Complete the sign-in flow
5. Watch the emulator logs for function execution

---

## 📋 Prerequisites

### 1. Environment Variables

Make sure `functions/.env` exists with:

```env
GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GOOGLE_SHEET_ID=your-test-sheet-id
```

**Note**: Even in emulator mode, Google Sheets/Drive API calls go to **real Google services**. The emulator only mocks Firebase services (Auth, Firestore, Storage, Functions).

### 2. Google OAuth Test Users

For testing Google Sign-In locally, add test users:

1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=<YOUR_PROJECT_ID>
2. Click **"Test users"** tab
3. Add your email address
4. Save

---

## 🔍 What Gets Emulated vs Real

### ✅ Emulated (Local)
- Firebase Auth (sign-in, tokens)
- Firestore (business documents)
- Firebase Storage
- Cloud Functions (runs locally)
- Function logs

### 🌐 Real (Production APIs)
- Google Sign-In OAuth flow
- Google Drive API (creates real folders)
- Google Sheets API (creates real sheets)
- Service Account authentication

**Why**: Firebase emulators don't mock Google APIs. They only mock Firebase services.

---

## 🧪 Testing Checklist

- [ ] Functions built (`npm run build` in functions/)
- [ ] Emulators running (`firebase emulators:start`)
- [ ] Business signup page opens with `?emulator=true`
- [ ] Console shows: `🔧 Emulator mode enabled`
- [ ] Console shows: `✅ Connected to Functions emulator`
- [ ] Can enter business name
- [ ] Google Sign-In button works
- [ ] OAuth popup appears
- [ ] Can sign in with test user
- [ ] Function logs appear in terminal
- [ ] Business document created in Firestore emulator
- [ ] Success message appears

---

## 📊 Monitor Function Execution

### In Terminal (Emulator Logs)

Watch for:
```
[Business Management] Provisioning business
[Business Provisioning] Starting provisioning
[Business Provisioning] Step 1: Creating Drive folder
[Business Provisioning] ✅ Folder created
[Business Provisioning] Step 2: Creating Sheet
[Business Provisioning] ✅ Sheet created
[Business Management] Business provisioned successfully
```

### In Emulator UI

1. Go to: http://localhost:4000
2. Click **"Functions"** tab
3. See function invocations and logs
4. Click **"Firestore"** tab
5. Check `businesses` collection for new documents

---

## 🐛 Troubleshooting

### Functions Not Found (404)

**Problem**: Functions return 404 in emulator

**Solution**:
1. Make sure functions are built: `cd functions && npm run build && cd ..`
2. Restart emulators: Stop (Ctrl+C) and run `firebase emulators:start` again
3. Check emulator logs for function loading errors

### CORS Errors

**Problem**: CORS errors when calling functions

**Solution**: 
- Make sure you're using `?emulator=true` in the URL
- Check that Functions emulator is running on port 5001
- Verify console shows: `✅ Connected to Functions emulator`

### Google API Errors

**Problem**: "Permission denied" or "API not enabled"

**Solution**:
- These are **real Google API errors** (not emulator issues)
- Make sure Google Sheets API and Drive API are enabled
- Verify service account has proper permissions
- Check that `GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY` is set in `functions/.env`

### Functions Not Loading

**Problem**: Functions don't appear in emulator

**Solution**:
1. Check `functions/src/index.ts` exports the functions
2. Rebuild: `cd functions && npm run build && cd ..`
3. Check for TypeScript compilation errors
4. Restart emulators

---

## 🎯 Advantages of Local Testing

✅ **Fast iteration** - No deployment needed  
✅ **Free** - No Cloud Function invocations  
✅ **Safe** - Test without affecting production  
✅ **Debugging** - See logs immediately  
✅ **Isolated** - Test with clean Firestore data  

---

## 📝 Next Steps After Local Testing

Once local testing works:

1. **Deploy to production**: `.\deploy.ps1` or `firebase deploy --only functions`
2. **Test in production**: Use live Firebase (remove `?emulator=true`)
3. **Monitor logs**: `firebase functions:log --project=<YOUR_PROJECT_ID>`

---

**Status**: ✅ Ready for local testing! Just build functions and start emulators.

