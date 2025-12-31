# Setup Live Firebase for Local Development

## 🎯 Why Use Live Firebase?

For apps that heavily use **Google Sign-In** and **Google Drive/Sheets API**, testing with live Firebase is recommended because:

- ✅ Real Google Sign-In popups work perfectly
- ✅ No token validation issues
- ✅ Service Account permissions work natively
- ✅ Faster feedback loop for UI changes
- ✅ Tests the actual production environment

## 📋 Setup Steps

### 1. Authorized Domains

Your Firebase project needs to allow `localhost` for Google Sign-In:

1. Go to [Firebase Console](https://console.firebase.google.com/project/financialanaliyst/authentication/settings)
2. Navigate to **Authentication** → **Settings** → **Authorized domains**
3. Ensure `localhost` is in the list (it should be there by default)
4. If not, click **Add domain** and add `localhost`

### 2. Configuration

The app is now configured to use **live Firebase by default**. 

To switch modes:

**Use Live Firebase (Default - Recommended):**
- Just open the app normally
- No URL parameters needed
- Google Sign-In will work with real Google accounts

**Use Emulators (For Testing):**
- Add `?emulator=true` to the URL: `http://localhost:5000/business-signup.html?emulator=true`
- Or set in browser console: `localStorage.setItem('useEmulator', 'true')`
- Then refresh the page

### 3. Deploy Functions

Since you're using live Firebase, deploy your functions:

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:provisionNewBusiness
```

### 4. Environment Variables

Make sure your Cloud Functions have the required environment variables:

```bash
# Set service account key (if using Secret Manager)
firebase functions:secrets:set GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY

# Or set via .env file (for local function testing)
# The .env file should be in functions/.env
```

## 🔄 Hybrid Mode (Best of Both Worlds)

The current setup allows you to:

1. **Develop UI locally** - Make changes to HTML/JS, see them instantly
2. **Test with live Firebase** - Real Google Sign-In, real Cloud Functions
3. **Switch to emulators** - When you need to test without affecting production data

## 🧪 Testing Checklist

- [ ] Authorized domains includes `localhost`
- [ ] Functions are deployed: `firebase deploy --only functions`
- [ ] Service account has correct permissions (run `.\verify-permissions.ps1`)
- [ ] Google Sign-In works without 400 errors
- [ ] Business provisioning works end-to-end

## 🐛 Troubleshooting

### "400 Bad Request" on Google Sign-In

**Solution:** You're likely in emulator mode. Remove `?emulator=true` from URL or clear localStorage:
```javascript
localStorage.removeItem('useEmulator');
location.reload();
```

### "Permission Denied" on Business Creation

**Solution:** 
1. Verify service account permissions: `.\verify-permissions.ps1`
2. Check Cloud Function logs: `firebase functions:log`
3. Ensure functions are deployed: `firebase deploy --only functions`

### Functions Not Updating

**Solution:** Redeploy functions after code changes:
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

## 📝 Quick Reference

**Use Live Firebase (Default):**
```
http://localhost:5000/business-signup.html
```

**Use Emulators:**
```
http://localhost:5000/business-signup.html?emulator=true
```

**Toggle via Console:**
```javascript
// Enable emulators
localStorage.setItem('useEmulator', 'true');
location.reload();

// Disable emulators (use live)
localStorage.removeItem('useEmulator');
location.reload();
```

---

**Last Updated:** December 2025  
**Project:** financialanaliyst

