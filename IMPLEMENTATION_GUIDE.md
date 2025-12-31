# Automated Provisioning Implementation Guide

## ✅ What's Been Implemented

### Core System
1. **Business Provisioning System** (`business-provisioning.ts`)
   - ✅ Creates Google Drive folder automatically
   - ✅ Creates Google Sheet inside folder
   - ✅ Grants permissions to bookkeeper
   - ✅ Supports OAuth (personal accounts)
   - ✅ Supports Domain-Wide Delegation (Google Workspace)
   - ✅ Falls back to service account (with manual sharing)

2. **Business Management Functions** (`business-management.ts`)
   - ✅ `provisionNewBusiness` - Create new business
   - ✅ `getBusinessDetails` - Get business info
   - ✅ `updateBusinessSettings` - Update business config
   - ✅ `addAuthorizedUser` - Add users to business

3. **Business Lookup** (`business-lookup.ts`)
   - ✅ Finds business for user (bookkeeper or driver)
   - ✅ Gets business sheet ID
   - ✅ Gets business settings (tabs, currency, etc.)

4. **Receipt Processing Integration**
   - ✅ Updated `appendReceiptToUserSheet` to use businesses
   - ✅ Falls back to Phase 4 sheet configs (backward compatible)
   - ✅ Priority: Business → Sheet Config → Environment Variable

---

## 🚀 Next Steps

### Step 1: Deploy Cloud Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Step 2: Create Business Signup UI

Create a frontend page where bookkeepers can:
1. Enter business name
2. Sign in with Google (to get OAuth token)
3. Call `provisionNewBusiness` Cloud Function

**Example Frontend Code:**

```javascript
// public/business-signup.html/js
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const functions = getFunctions();
const auth = getAuth();
const googleProvider = new GoogleAuthProvider();

// Request Drive scope
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');

async function signupBusiness() {
  try {
    // 1. Sign in with Google (get OAuth token)
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    
    if (!accessToken) {
      throw new Error('Failed to get Google OAuth token');
    }
    
    // 2. Get business name
    const businessName = document.getElementById('business-name').value;
    
    // 3. Call provisioning function
    const provisionBusiness = httpsCallable(functions, 'provisionNewBusiness');
    const result = await provisionBusiness({
      businessName,
      googleAccessToken: accessToken
    });
    
    console.log('Business provisioned:', result.data);
    alert('Business created successfully!');
    
  } catch (error) {
    console.error('Error provisioning business:', error);
    alert('Failed to create business: ' + error.message);
  }
}
```

### Step 3: Update Firestore Security Rules

Add rules for `businesses` collection:

```javascript
match /businesses/{businessId} {
  // Only bookkeeper can read their own business
  allow read: if request.auth != null && 
    (request.auth.uid == resource.data.bookkeeperUid ||
     request.auth.token.email in resource.data.authorizedUsers);
  
  // Only bookkeeper can write
  allow write: if request.auth != null && 
    request.auth.uid == resource.data.bookkeeperUid;
}
```

### Step 4: Test Provisioning

1. Sign up as a bookkeeper
2. Call `provisionNewBusiness` with business name
3. Verify folder and sheet are created
4. Verify permissions are granted
5. Upload a receipt and verify it goes to the correct sheet

---

## 🔐 Domain-Wide Delegation Setup (Google Workspace)

For businesses using Google Workspace, set up Domain-Wide Delegation:

### Step 1: Get Service Account Client ID

```bash
# In your service account JSON key, find:
"client_id": "123456789-abc@developer.gserviceaccount.com"
```

### Step 2: Authorize in Google Admin Console

1. Go to [Google Admin Console](https://admin.google.com)
2. Security → API Controls → Domain-wide Delegation
3. Add new → Enter your Service Account Client ID
4. Authorize these scopes:
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/spreadsheets`

### Step 3: Use DWD in Provisioning

When provisioning, pass the bookkeeper's email:

```javascript
await provisionBusiness(
  businessName,
  bookkeeperUid,
  bookkeeperEmail,
  undefined, // No OAuth token
  bookkeeperEmail // Use DWD with this email
);
```

---

## 📊 Migration from Phase 4

### Existing Entities → Businesses

Create a migration script:

```javascript
// migrate-entities-to-businesses.js
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

async function migrateEntities() {
  const entities = await db.collection('entities').get();
  
  for (const entityDoc of entities.docs) {
    const entity = entityDoc.data();
    
    // Find bookkeeper for this entity
    const users = await db.collection('users')
      .where('entity', '==', entityDoc.id)
      .limit(1)
      .get();
    
    if (!users.empty) {
      const user = users.docs[0];
      const userData = user.data();
      
      // Provision business
      // (Call provisionNewBusiness Cloud Function)
    }
  }
}
```

---

## 🎯 Testing Checklist

- [ ] Bookkeeper can sign up and provision business
- [ ] Folder is created in correct location
- [ ] Sheet is created with correct tabs
- [ ] Permissions are granted correctly
- [ ] Driver can upload receipt
- [ ] Receipt goes to correct business sheet
- [ ] Backward compatibility with Phase 4 sheet configs
- [ ] OAuth token works for personal accounts
- [ ] DWD works for Google Workspace accounts
- [ ] Service account fallback works

---

## 📝 Notes

- **OAuth Tokens**: Expire after 1 hour. You may need to refresh them or request new ones.
- **DWD**: Requires Google Workspace. Personal accounts must use OAuth.
- **Service Account**: Has 0 GB quota. Use OAuth or DWD for production.
- **Backward Compatibility**: Existing Phase 4 sheet configs still work.

---

**Status**: ✅ Core system implemented, ready for testing and UI integration

