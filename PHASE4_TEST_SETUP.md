# Phase 4: Test Business Setup Guide

This guide helps you set up multiple test businesses to verify sheet separation works correctly.

---

## 🚀 Quick Setup

### Step 1: Set Environment for Emulator

```powershell
# Set Firestore emulator host
$env:FIRESTORE_EMULATOR_HOST = "localhost:8080"

# Verify
echo $env:FIRESTORE_EMULATOR_HOST
```

### Step 2: Run Setup Script

```powershell
# Make sure emulators are running first!
# Then run:
node setup-test-businesses.js
```

This will create:
- 3 test entities (Business A, B, C)
- User documents for each business
- Sheet configs (with placeholder sheet IDs)
- Entity-to-sheet assignments

---

## 📋 What Gets Created

### Entities
- `business-a` - Terry's Meat Shop
- `business-b` - Test Company  
- `business-c` - Demo Corp

### Users (Firestore documents)
- `terry@business-a.com` → Business A
- `admin@business-b.com` → Business B
- `demo@business-c.com` → Business C

### Sheet Configs
- `config-business-a` → Business A Receipts
- `config-business-b` → Business B Receipts
- `config-business-c` → Business C Receipts

---

## 🔧 Step 3: Create Google Sheets

For each business, you need to:

1. **Create a Google Sheet**:
   - Business A: "Business A Receipts"
   - Business B: "Business B Receipts"
   - Business C: "Business C Receipts"

2. **Share with service account**:
   - Email: `financial-output@financialanaliyst.iam.gserviceaccount.com`
   - Permission: Editor

3. **Get Sheet IDs** from URLs:
   - URL format: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - Copy the `{SHEET_ID}` part

---

## 📝 Step 4: Update Sheet IDs in Firestore

### Option A: Using Emulator UI

1. Go to http://127.0.0.1:4000
2. Click **Firestore** tab
3. Go to `sheet_configs` collection
4. For each config:
   - Click on the document
   - Edit `sheetId` field
   - Replace `PLACEHOLDER-business-a` with actual sheet ID
   - Save

### Option B: Using Script

Create `update-sheet-ids.js`:

```javascript
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'financialanaliyst' });
const db = admin.firestore();

const sheetIds = {
  'config-business-a': 'YOUR_SHEET_ID_A',
  'config-business-b': 'YOUR_SHEET_ID_B',
  'config-business-c': 'YOUR_SHEET_ID_C'
};

async function updateSheetIds() {
  for (const [configId, sheetId] of Object.entries(sheetIds)) {
    await db.collection('sheet_configs').doc(configId).update({
      sheetId: sheetId,
      lastModified: new Date().toISOString()
    });
    console.log(`✅ Updated ${configId} with sheet ID`);
  }
}

updateSheetIds();
```

Run: `node update-sheet-ids.js`

---

## 👤 Step 5: Create Auth Users

1. Go to http://127.0.0.1:4000 → **Authentication**
2. Click **"Add user"** for each:
   - Email: `terry@business-a.com` (password: `test123`)
   - Email: `admin@business-b.com` (password: `test123`)
   - Email: `demo@business-c.com` (password: `test123`)

3. **Set admin claims** (optional, for testing admin features):
   - Click 3 dots (⋮) → "Set custom user claims"
   - Enter: `{ "admin": true }`

---

## 🧪 Step 6: Test Separation

### Test 1: Upload as Business A User

1. Log in as `terry@business-a.com` at http://127.0.0.1:5000
2. Upload a test receipt
3. **Verify**: Receipt appears in **Business A Sheet** only
4. **Check logs**: Should show `[Sheet Config] Found active entity-level config`

### Test 2: Upload as Business B User

1. Log in as `admin@business-b.com`
2. Upload a test receipt
3. **Verify**: Receipt appears in **Business B Sheet** only
4. **Check**: Business A Sheet should NOT have this receipt

### Test 3: Upload as Business C User

1. Log in as `demo@business-c.com`
2. Upload a test receipt
3. **Verify**: Receipt appears in **Business C Sheet** only
4. **Check**: Other sheets should NOT have this receipt

---

## ✅ Verification Checklist

- [ ] All 3 entities created in Firestore
- [ ] All 3 sheet configs created
- [ ] All 3 Google Sheets created and shared
- [ ] Sheet IDs updated in Firestore
- [ ] All 3 auth users created
- [ ] Test receipt from Business A → Business A Sheet only
- [ ] Test receipt from Business B → Business B Sheet only
- [ ] Test receipt from Business C → Business C Sheet only
- [ ] No cross-contamination between sheets

---

## 🔍 Check Logs

In terminal running emulators, look for:

```
[Sheet Config] Looking up sheet config for user: ...
[Sheet Config] User belongs to entity: business-a
[Sheet Config] Entity has sheet assignment: config-business-a
[Sheet Config] Found active entity-level config
[Multi-Sheet] Using sheet: {SHEET_ID_A} (config: config-business-a)
```

---

## 🐛 Troubleshooting

### Receipts going to wrong sheet
- ✅ Check entity assignment in Firestore (`/entities/{entityId}.sheetConfigId`)
- ✅ Check user's entity (`/users/{userId}.entity`)
- ✅ Verify sheet config status is 'active'

### Sheet not found errors
- ✅ Verify sheet ID is correct in Firestore
- ✅ Check sheet is shared with service account
- ✅ Verify service account has Editor access

### User not found
- ✅ Create auth user in Emulator UI
- ✅ Create user document in Firestore (`/users` collection)

---

## 📊 Expected Results

After setup, you should have:

**Firestore Collections:**
- `/entities` - 3 entities
- `/users` - 3 user documents
- `/sheet_configs` - 3 configs

**Google Sheets:**
- 3 separate sheets, each receiving only their business's receipts

**Test Results:**
- ✅ Complete separation between businesses
- ✅ No cross-contamination
- ✅ Each business's receipts in their own sheet

---

**Ready to test!** 🎉

