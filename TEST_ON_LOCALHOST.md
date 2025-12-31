# Test on Localhost Instead of Production

## ⚠️ Issue

You're currently testing on **production** (`<YOUR_PROJECT_ID>.firebaseapp.com`), but the emulators are running on **localhost**. 

The OAuth callback is working, but you need to test on the local development server.

---

## ✅ Solution: Use Localhost

### 1. Open Localhost URL

Instead of the production URL, open:

```
http://localhost:5000/business-signup.html
```

### 2. Make Sure Emulators Are Running

Check that you see:
- Emulator UI: http://localhost:4000
- Hosting: http://localhost:5000

### 3. Test the Flow

1. Go to: **http://localhost:5000/business-signup.html**
2. Enter business name
3. Click "Sign in with Google"
4. Complete OAuth flow
5. Business should be provisioned

---

## 🔧 Why This Matters

- **Production** (`<YOUR_PROJECT_ID>.firebaseapp.com`) uses **deployed** Cloud Functions
- **Localhost** (`localhost:5000`) uses **emulated** Cloud Functions
- For development, always use **localhost**

---

## 📋 Quick Checklist

- [ ] Emulators running (`firebase emulators:start`)
- [ ] Using `http://localhost:5000/business-signup.html` (NOT production)
- [ ] Google OAuth test user added
- [ ] Business name entered
- [ ] Google Sign-In clicked

---

**Next Step**: Open `http://localhost:5000/business-signup.html` in your browser

