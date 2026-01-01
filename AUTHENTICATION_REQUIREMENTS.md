# Authentication Requirements

## Overview

The application has different authentication requirements for different user types:

---

## 🔐 Business Admins (Bookkeepers)

**Requirement**: **MUST use Google Sign-In**

### Why Google Sign-In is Recommended:
- Business admins (Bookkeepers) manage sensitive financial data silos
- Provides secure authentication through Identity Platform
- Enables seamless integration with enterprise identity providers
- Simplifies the multi-tenant signup process

### Implementation:
- Business signup page (`business-signup.html`) uses Google Sign-In for enterprise identity
- Tenant context is automatically set during the provisioning flow
- Email/password signup is available for individual Drivers within a tenant

### User Flow:
1. User navigates to Business Signup page
2. Enters business name
3. Clicks "Sign in with Google" to establish ownership
4. System provisions a secure Firestore silo for the business

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

| User Type | Email/Password | Google Sign-In | Silo Access Required |
|-----------|---------------|----------------|----------------------|
| **Business Admin** | ❌ No | ✅ Required | ✅ Yes |
| **Regular User** | ✅ Yes | ✅ Optional | ✅ Yes |

---

## 🔧 Technical Details

### Business Admin Authentication:
```javascript
// Google Sign-In for Enterprise Identity
const provider = new GoogleAuthProvider();
// No additional Drive/Sheets scopes required (DEPRECATED)
```

### Regular User Authentication:
```javascript
// Email/Password within Tenant Context
await signInWithEmailAndPassword(auth, email, password);

// OR Google Sign-In
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

