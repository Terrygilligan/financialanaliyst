# Local Testing Quick Reference

## ✅ Yes, You Can Test Locally!

The business signup functions work perfectly with Firebase emulators.

---

## 🚀 3-Step Quick Start

### 1. Build Functions
```bash
cd functions
npm run build
cd ..
```

### 2. Start Emulators
```bash
firebase emulators:start
```

### 3. Open with Emulator Mode
```
http://localhost:5000/business-signup.html?emulator=true
```

That's it! The functions will run locally.

---

## 📋 What You Need

### Required
- ✅ Functions built (`npm run build`)
- ✅ Emulators running (`firebase emulators:start`)
- ✅ `functions/.env` with `GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY`

### Optional
- Google OAuth test user (for Google Sign-In testing)

---

## 🔍 Verify It's Working

### Check Console
You should see:
- `🔧 Emulator mode enabled`
- `✅ Connected to Functions emulator on localhost:5001`

### Check Terminal
Function logs will appear in the terminal running `firebase emulators:start`

### Check Emulator UI
- Functions: http://localhost:4000 → Functions tab
- Firestore: http://localhost:4000 → Firestore tab → `businesses` collection

---

## ⚠️ Important Notes

1. **Google APIs are REAL** - Even in emulator mode, Google Drive/Sheets API calls go to real Google services
2. **Build First** - Functions must be built before emulator can run them
3. **URL Parameter** - Use `?emulator=true` or set `localStorage.setItem('useEmulator', 'true')`

---

## 🐛 Quick Fixes

| Problem | Solution |
|---------|----------|
| 404 errors | Build functions: `cd functions && npm run build && cd ..` |
| Functions not loading | Restart emulators |
| CORS errors | Add `?emulator=true` to URL |
| Google API errors | Check `functions/.env` and service account permissions |

---

## 📚 Full Guides

- **Detailed Guide**: See `TEST_BUSINESS_SIGNUP_LOCAL.md`
- **General Testing**: See `LOCAL_TESTING_GUIDE.md`
- **Phase 4 Testing**: See `PHASE4_LOCAL_TESTING.md`

---

**Status**: ✅ Ready! Just build and start emulators.

