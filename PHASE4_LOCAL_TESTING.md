# Phase 4: Multi-Sheet Management - Local Testing Guide

**Status**: Ready for Local Testing  
**Prerequisites**: Firebase emulators configured

---

## 🚀 Quick Start

### 1. Start Firebase Emulators

```bash
# From project root
firebase emulators:start
```

This will start:
- **Functions Emulator**: http://127.0.0.1:5001
- **Firestore Emulator**: http://127.0.0.1:8080
- **Auth Emulator**: http://127.0.0.1:9099
- **Storage Emulator**: http://127.0.0.1:9199
- **Emulator UI**: http://127.0.0.1:4000
- **Hosting Emulator**: http://127.0.0.1:5000

### 2. Configure Environment Variables

Create or update `functions/.env`:

```env
# Required
GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GOOGLE_SHEET_ID=your-test-sheet-id

# Optional
BASE_CURRENCY=GBP
ENABLE_REVIEW_WORKFLOW=true
```

**Note**: For local testing, you'll use **real Google Sheets** (emulators don't mock Google Sheets API). Make sure your test sheets are shared with the service account.

---

## 🧪 Testing Phase 4 Features Locally

### Test 1: Access Sheet Management Page

**Steps**:
1. Start emulators: `firebase emulators:start`
2. Open http://127.0.0.1:5000
3. Sign up or log in as a user
4. Set admin custom claim (see below)
5. Navigate to **Admin Dashboard** → **Sheet Management**

**Expected**:
- ✅ Page loads at http://127.0.0.1:5000/admin-sheets.html
- ✅ Shows "No sheet configurations found" (if none exist)
- ✅ "Create New Sheet Config" button visible

---

### Test 2: Set Admin Custom Claim (Local)

**Method 1: Using Emulator UI (Easiest)**

1. Go to http://127.0.0.1:4000 (Emulator UI)
2. Click **"Authentication"** tab
3. Find your user in the list
4. Click the **3 dots** menu (⋮) → **"Set custom user claims"**
5. Enter: `{ "admin": true }`
6. Click **"Save"**
7. **Refresh** your app page
8. You should now see admin links!

**Method 2: Using Cloud Function**

1. Call `setAdminClaim` function from browser console:
```javascript
const functions = getFunctions(app, 'us-central1');
const setAdminClaim = httpsCallable(functions, 'setAdminClaim');
await setAdminClaim({ uid: 'YOUR_USER_ID' });
```

**Method 3: Direct Firestore (Fallback)**

1. Go to Emulator UI → Firestore
2. Create collection: `admins`
3. Add document with ID = your email
4. Document: `{ "email": "your@email.com", "createdAt": "timestamp" }`

---

### Test 3: Create Sheet Configuration (Existing Sheet)

**Steps**:
1. Have a test Google Sheet ready (share with service account)
2. Go to Sheet Management page
3. Click **"+ Create New Sheet Config"**
4. Select **"Use existing Google Sheet"**
5. Fill in:
   - **Name**: "Test Sheet 1"
   - **Sheet ID**: (from Google Sheets URL)
   - **Main Tab**: "Sheet1" (or leave blank)
   - **Accountant Tab**: "Accountant_CSV_Ready" (or leave blank)
   - **Default**: Checked
6. Click **"Verify Sheet"** button
7. Wait for verification (should show ✅)
8. Click **"Save Configuration"**

**Check Results**:
- ✅ Success message appears
- ✅ New config appears in list
- ✅ Check Emulator UI → Firestore → `sheet_configs` collection
- ✅ Document should have all fields populated

**Verify in Firestore**:
```
Collection: sheet_configs
Document ID: (auto-generated)
Fields:
  - name: "Test Sheet 1"
  - sheetId: "your-sheet-id"
  - isDefault: true
  - status: "active"
  - createdAt: (timestamp)
  - config: { mainTabName: "Sheet1", ... }
```

---

### Test 4: Create New Google Sheet via UI

**Steps**:
1. Click **"+ Create New Sheet Config"**
2. Select **"Create new Google Sheet"** radio button
3. Fill in:
   - **Name**: "Test Sheet 2"
   - **Accountant Tab**: "Accountant_CSV_Ready"
   - **Default**: Unchecked
4. Click **"Save Configuration"**
5. Wait for sheet creation (10-20 seconds)

**Check Results**:
- ✅ Loading indicator shows
- ✅ Success message appears
- ✅ New config appears in list
- ✅ Sheet ID is populated
- ✅ Sheet automatically shared with service account

**Verify**:
- Check Google Drive for new sheet
- Check Firestore for new config document
- Sheet should have headers in both tabs

---

### Test 5: Sheet Health Check

**Steps**:
1. Create a sheet config
2. Click **"🔍 Health"** button on the config card
3. Verify health check results

**Test Cases**:

**Valid Sheet**:
- ✅ Should show: "Sheet is healthy and accessible!"
- ✅ All checks pass

**Invalid Sheet ID**:
- ❌ Should show error message
- ❌ Clear error about invalid ID

**Sheet Not Shared**:
- ❌ Should show permission error
- ❌ Message about service account access

**Check Logs**:
```bash
# In terminal running emulators, look for:
[Admin Sheet] Checking health for sheet: ...
[Admin Sheet] ✅ Health check complete: accessible=true
```

---

### Test 6: Assign Sheet to Entity

**Prerequisites**:
- Create a test entity in Firestore:
  - Collection: `entities`
  - Document ID: `test-entity-1`
  - Fields: `{ "name": "Test Entity", "createdAt": "timestamp" }`

**Steps**:
1. Create a sheet config
2. Click **"👥 Assign"** button
3. Go to **"Assign to Entities"** tab
4. Select entity from dropdown
5. Click **"Assign Entity"**
6. Confirm assignment

**Check Results**:
- ✅ Success message appears
- ✅ Entity appears in "View Current Assignments" tab
- ✅ Check Firestore: `/entities/test-entity-1` should have `sheetConfigId` field

**Verify in Firestore**:
```
Collection: entities
Document: test-entity-1
Fields:
  - name: "Test Entity"
  - sheetConfigId: "your-config-id"
  - lastModified: (timestamp)
```

---

### Test 7: Assign Sheet to User

**Steps**:
1. Create a sheet config
2. Click **"👥 Assign"** button
3. Go to **"Assign to Users"** tab
4. Select one or more users (Ctrl/Cmd+click for multiple)
5. Click **"Assign Selected Users"**
6. Confirm assignment

**Check Results**:
- ✅ Success message shows count
- ✅ Users appear in assignments list
- ✅ Check Firestore: `/users/{userId}` should have `sheetConfigId` field

**Verify in Firestore**:
```
Collection: users
Document: {userId}
Fields:
  - sheetConfigId: "your-config-id"
  - lastModified: (timestamp)
```

---

### Test 8: Test Sheet Routing (User Override)

**Setup**:
1. Create User A
2. Create Entity X, assign User A to it
3. Assign Entity X to Sheet 1
4. Assign User A directly to Sheet 2

**Steps**:
1. Upload receipt as User A
2. Check which sheet receives the receipt

**Expected**:
- ✅ Receipt goes to Sheet 2 (user override)
- ✅ NOT Sheet 1 (entity assignment)

**Check Logs**:
```bash
# Look for in terminal:
[Sheet Config] Looking up sheet config for user: {userId}
[Sheet Config] User has direct sheet assignment: {configId}
[Sheet Config] Found active user-specific config
[Multi-Sheet] Using sheet: {sheetId} (config: {configId})
```

**Verify in Google Sheet**:
- Check Sheet 2 for new receipt row
- Sheet 1 should NOT have the receipt

---

### Test 9: Test Sheet Routing (Entity Assignment)

**Setup**:
1. Create User B
2. Create Entity Y
3. Assign User B to Entity Y
4. Assign Entity Y to Sheet 3
5. User B has NO direct assignment

**Steps**:
1. Upload receipt as User B
2. Check which sheet receives the receipt

**Expected**:
- ✅ Receipt goes to Sheet 3 (entity assignment)
- ✅ Logs show entity-level config used

**Check Logs**:
```bash
[Sheet Config] User belongs to entity: {entityId}
[Sheet Config] Entity has sheet assignment: {configId}
[Sheet Config] Found active entity-level config
```

---

### Test 10: Test Sheet Routing (Default Config)

**Setup**:
1. Create User C
2. User C has no entity, no direct assignment
3. Create default sheet config (isDefault: true) pointing to Sheet 4

**Steps**:
1. Upload receipt as User C
2. Check which sheet receives the receipt

**Expected**:
- ✅ Receipt goes to Sheet 4 (default config)
- ✅ Logs show default config used

**Check Logs**:
```bash
[Sheet Config] Looking for default sheet config
[Sheet Config] Found default config: {configId}
```

---

### Test 11: Test Sheet Routing (Environment Fallback)

**Setup**:
1. Create User D
2. User D has no entity, no assignment
3. NO default config exists
4. `GOOGLE_SHEET_ID` in `.env` points to Sheet 5

**Steps**:
1. Upload receipt as User D
2. Check which sheet receives the receipt

**Expected**:
- ✅ Receipt goes to Sheet 5 (env variable)
- ✅ Logs show "falling back to environment variable"
- ✅ No errors

**Check Logs**:
```bash
[Sheet Config] No sheet config found, falling back to environment variable
[Multi-Sheet] Using sheet: {sheetId} (env default)
```

---

### Test 12: Statistics Tracking

**Steps**:
1. Note current `totalReceipts` in a sheet config
2. Upload receipt that routes to that sheet
3. Wait for processing
4. Check sheet config stats

**Expected**:
- ✅ `stats.totalReceipts` incremented by 1
- ✅ `stats.lastReceiptAt` updated

**Check Firestore**:
```
Collection: sheet_configs
Document: {configId}
Fields:
  - stats:
      totalReceipts: (incremented)
      lastReceiptAt: (new timestamp)
```

**Check UI**:
- Refresh Sheet Management page
- Config card should show updated receipt count

---

### Test 13: Edit Sheet Configuration

**Steps**:
1. Click **"✏️ Edit"** on a config
2. Change the name
3. Change tab names
4. Toggle default checkbox
5. Save changes

**Expected**:
- ✅ Modal opens with current values
- ✅ Changes save successfully
- ✅ Updated values appear in list
- ✅ If set as default, other defaults unset

**Check Firestore**:
- Document should have updated `name`, `config`, `isDefault`
- `lastModified` should be updated

---

### Test 14: Delete Sheet Configuration

**Steps**:
1. Click **"🗑️ Delete"** on a config
2. Confirm deletion
3. Verify config disappears from list

**Expected**:
- ✅ Confirmation dialog appears
- ✅ Config removed from active list
- ✅ Config still exists in Firestore with `status: 'inactive'`

**Check Firestore**:
```
Collection: sheet_configs
Document: {configId}
Fields:
  - status: "inactive"
  - lastModified: (updated)
```

---

### Test 15: Bulk User Assignment

**Steps**:
1. Create a sheet config
2. Go to "Assign to Users" tab
3. Select 3+ users (Ctrl/Cmd+click)
4. Click "Assign Selected Users"
5. Verify all users assigned

**Expected**:
- ✅ Multiple users can be selected
- ✅ Bulk assignment succeeds
- ✅ Success message shows count
- ✅ All users appear in assignments list

---

## 🔍 Debugging Tips

### Check Function Logs

```bash
# In terminal running emulators, look for:
[Admin Sheet] Creating new config: ...
[Admin Sheet] ✅ Config created: {configId}
[Sheet Config] Looking up sheet config for user: ...
[Multi-Sheet] Processing receipt for user: ...
```

### Check Firestore Data

1. Go to Emulator UI: http://127.0.0.1:4000
2. Click **"Firestore"** tab
3. Check collections:
   - `sheet_configs` - All sheet configurations
   - `users` - User sheet assignments
   - `entities` - Entity sheet assignments

### Check Function Calls

1. Go to Emulator UI: http://127.0.0.1:4000
2. Click **"Functions"** tab
3. See all function calls and their results

### Common Issues

**"User must be an admin" Error**:
- ✅ Set admin custom claim (see Test 2)
- ✅ Refresh page after setting claim

**Sheet Health Check Fails**:
- ✅ Verify sheet is shared with service account
- ✅ Check sheet ID is correct
- ✅ Verify service account key in `.env`

**Receipt Not Routing Correctly**:
- ✅ Check Firestore for user/entity assignments
- ✅ Check logs for lookup priority
- ✅ Verify default config exists (if needed)

**Functions Not Found**:
- ✅ Make sure emulators are running
- ✅ Check `firebase.json` has emulator config
- ✅ Verify functions are built: `cd functions && npm run build`

---

## 📋 Quick Testing Checklist

### Setup
- [ ] Emulators running
- [ ] Environment variables set in `functions/.env`
- [ ] Admin custom claim set
- [ ] Test Google Sheets created and shared

### Basic Operations
- [ ] Access Sheet Management page
- [ ] Create sheet config (existing sheet)
- [ ] Create sheet config (new sheet)
- [ ] Edit sheet config
- [ ] Delete sheet config
- [ ] Sheet health check works

### Assignments
- [ ] Assign sheet to entity
- [ ] Assign sheet to user
- [ ] Bulk assign users
- [ ] View current assignments

### Routing Tests
- [ ] User override works (user > entity)
- [ ] Entity assignment works
- [ ] Default config works
- [ ] Environment fallback works

### Statistics
- [ ] Stats increment after receipt write
- [ ] Stats visible in UI

---

## 🎯 Testing with Real Receipts

### End-to-End Test

1. **Setup**:
   - Create 2 sheet configs (Sheet A and Sheet B)
   - Assign User 1 to Sheet A
   - Assign Entity X to Sheet B
   - Assign User 2 to Entity X

2. **Test**:
   - Upload receipt as User 1 → Should go to Sheet A
   - Upload receipt as User 2 → Should go to Sheet B
   - Upload receipt as User 3 (no assignment) → Should go to default or env sheet

3. **Verify**:
   - Check Google Sheets for correct routing
   - Check Firestore stats updated
   - Check logs for correct lookup path

---

## 📝 Notes

### Important for Local Testing

1. **Google Sheets API**: Emulators don't mock Google Sheets API, so you'll use real sheets
2. **Service Account**: Make sure test sheets are shared with service account
3. **Environment Variables**: Must be set in `functions/.env` for local testing
4. **Custom Claims**: Must be set manually in emulator (see Test 2)

### Performance

- Sheet lookups are fast (single Firestore read)
- Bulk operations may take a few seconds
- Sheet creation takes 10-20 seconds

---

## 🚀 Next Steps After Local Testing

Once local testing passes:

1. ✅ Fix any issues found
2. ✅ Run full test suite
3. ✅ Deploy to staging (if available)
4. ✅ Deploy to production

---

**Happy Local Testing!** 🎉

If you encounter issues, check:
- Terminal logs (where emulators are running)
- Emulator UI (http://127.0.0.1:4000)
- Browser console (F12)
- Firestore data structure

