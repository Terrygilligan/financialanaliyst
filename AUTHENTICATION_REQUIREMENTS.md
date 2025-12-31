# Authentication Requirements

## Overview

The application has different authentication requirements for different user types:

---

## 🔐 Business Admins (Bookkeepers)

**Requirement**: **MUST use Google Sign-In**

### Why Google Sign-In is Required:
- Business admins need to create Google Drive folders and Sheets automatically
- Google OAuth token is required to access user's Drive
- Enables automatic folder/sheet creation without manual sharing
- Provides seamless integration with Google Workspace

### Implementation:
- Business signup page (`business-signup.html`) only allows Google Sign-In
- OAuth token is extracted and used for provisioning
- Email/password signup is **not available** for business creation

### User Flow:
1. User navigates to Business Signup page
2. Enters business name
3. **Must** click "Sign in with Google"
4. Grants Drive and Sheets permissions
5. System creates folder and sheet automatically

---

## 👤 Regular Users (Drivers)

**Requirement**: **Can use Email/Password OR Google Sign-In**

### Why Both Options:
- Drivers don't need Drive access
- They only upload receipts
- Email/password is simpler for some users
- Google Sign-In is optional but available

### Implementation:
- Regular login page (`login.html`) supports both methods
- Email/password signup available
- Google Sign-In available as alternative
- No Drive scope required

### User Flow:
1. User navigates to Login page
2. Can choose:
   - **Email/Password**: Enter email and password
   - **Google Sign-In**: Click "Continue with Google"
3. Sign in and start uploading receipts

---

## 📋 Summary Table

| User Type | Email/Password | Google Sign-In | Drive Access Required |
|-----------|---------------|----------------|----------------------|
| **Business Admin** | ❌ No | ✅ Required | ✅ Yes |
| **Regular User** | ✅ Yes | ✅ Optional | ❌ No |

---

## 🔧 Technical Details

### Business Admin Authentication:
```javascript
// Google Sign-In with Drive scope
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Extract OAuth token
const credential = GoogleAuthProvider.credentialFromResult(result);
const googleAccessToken = credential?.accessToken;
```

### Regular User Authentication:
```javascript
// Email/Password
await signInWithEmailAndPassword(auth, email, password);

// OR Google Sign-In (no Drive scope needed)
await signInWithPopup(auth, googleProvider);
```

---

## 🎯 UI Differences

### Business Signup Page:
- ✅ Google Sign-In button (required)
- ❌ No email/password form
- ⚠️ Warning message about Google requirement

### Regular Login Page:
- ✅ Email/password form
- ✅ Google Sign-In button (optional)
- ✅ Toggle between login and signup

---

## 📝 Notes

- Business admins who try to use email/password will see a message directing them to use Google
- Regular users can always use either method
- Google Sign-In for business admins requests Drive and Sheets scopes
- OAuth tokens are used only for provisioning, not stored permanently

---

**Status**: ✅ Implemented and documented

