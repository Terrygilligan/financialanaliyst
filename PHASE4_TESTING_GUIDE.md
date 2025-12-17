# Phase 4: Multi-Sheet Management - Testing Guide

**Date**: December 17, 2025  
**Status**: ✅ Deployed - Ready for Testing

---

## 📋 Deployment Summary

### ✅ Backend (11 New Cloud Functions)
All functions deployed successfully to `us-central1`:

1. **createSheetConfiguration** - Create new sheet configs
2. **updateSheetConfiguration** - Update existing configs
3. **deleteSheetConfiguration** - Deactivate configs
4. **getSheetConfigurations** - List all configs
5. **checkSheetHealth** - Verify sheet access and permissions
6. **assignSheetConfigToUser** - Assign sheet to individual user
7. **assignSheetConfigToEntity** - Assign sheet to entire entity
8. **getSheetConfigAssignments** - View current assignments
9. **bulkAssignUsersToSheet** - Assign multiple users at once
10. **removeUserSheetAssignment** - Remove user assignment
11. **removeEntitySheetAssignment** - Remove entity assignment

### ✅ Frontend
- **admin-sheets.html** - Sheet management UI
- **admin-sheets.js** - Client-side logic
- **Updated styles.css** - UI styling
- **Updated admin.html** - Added navigation

**Live URL**: https://financialanaliyst.web.app/admin-sheets.html

---

## 🧪 Testing Checklist

### Phase 1: Setup Default Sheet Configuration

#### Step 1: Go to Firebase Console
1. Open: https://console.firebase.google.com/project/financialanaliyst/firestore
2. Navigate to **Firestore Database**

#### Step 2: Create Default Sheet Config
1. Click **+ Start collection** (or **Add collection**)
2. **Collection ID**: `sheet_configs`
3. Click **Next**
4. **Document ID**: Click **Auto-ID** to generate
5. Add the following fields:

```
Field Name          | Type      | Value
--------------------|-----------|---------------------------------------
name                | string    | Default Sheet
googleSheetId       | string    | YOUR_EXISTING_GOOGLE_SHEET_ID
isDefault           | boolean   | true
status              | string    | active
createdAt           | timestamp | (click "Set to current time")
updatedAt           | timestamp | (click "Set to current time")
```

6. **Optional**: Add a `config` map field with:
   - `mainTabName` (string): "Sheet1" (or your tab name)
   - `accountantTabName` (string): "Accountant_CSV_Ready"
   - `createTabsIfMissing` (boolean): true
   - `headerRow` (number): 1

7. Click **Save**

**Note**: Replace `YOUR_EXISTING_GOOGLE_SHEET_ID` with your current Google Sheet ID (the one from your `.env` file).

---

### Phase 2: Test Admin Sheet Management UI

#### Test 2.1: Access Admin Dashboard
1. Navigate to: https://financialanaliyst.web.app/admin.html
2. ✅ Verify you see **"Sheet Management"** link in navigation
3. Click **Sheet Management**

#### Test 2.2: View Sheet Configurations
1. You should see the "Default Sheet" config you created
2. ✅ Verify the card shows:
   - Name: "Default Sheet"
   - Badge: "Default"
   - Badge: "Active" (green)
   - Sheet ID
   - Total Receipts count
   - Created date

#### Test 2.3: Create New Sheet Config
1. Click **+ Create New Sheet Config**
2. Fill in the form:
   - **Name**: Test Sheet A
   - **Google Sheet ID**: (use a test sheet ID, or same as default)
   - **Main Tab**: Sheet1
   - **Accountant Tab**: Accountant_CSV_Ready
   - **Default**: Leave unchecked
3. Click **🔍 Verify Sheet** button
4. ✅ Verify you see a green success message (if sheet is accessible)
5. Click **💾 Save Configuration**
6. ✅ Verify the new config appears in the list

#### Test 2.4: Sheet Health Check
1. Find any sheet config card
2. Click **🔍 Health** button
3. ✅ Verify you see a popup:
   - Success: "✅ Sheet is healthy and accessible!"
   - Or error with instructions to share the sheet

#### Test 2.5: Edit Sheet Config
1. Find the "Test Sheet A" config
2. Click **✏️ Edit**
3. Change the name to: "Test Sheet A (Edited)"
4. Click **💾 Save Configuration**
5. ✅ Verify the name updated in the card

#### Test 2.6: Open Sheet in Browser
1. Click **📊 Open Sheet** on any config
2. ✅ Verify the Google Sheet opens in a new tab

---

### Phase 3: Test Sheet Assignments

#### Test 3.1: Assign Sheet to User
1. Find the "Test Sheet A" config
2. Click **👥 Assign**
3. Click the **"👥 Assign to Users"** tab
4. Select one or more users from the dropdown (use Ctrl/Cmd to multi-select)
5. Click **✓ Assign Selected Users**
6. ✅ Verify success message appears

#### Test 3.2: View Assignments
1. In the assignment modal, click **"📋 View Assignments"** tab
2. ✅ Verify you see the users you just assigned listed

#### Test 3.3: Assign Sheet to Entity
1. Click the **"🏢 Assign to Entities"** tab
2. Select an entity from the dropdown
   - **Note**: You may need to create an entity first in Firestore:
     - Collection: `entities`
     - Fields: `name` (string), `description` (string)
3. Click **✓ Assign Entity**
4. ✅ Verify success message
5. Go back to **"📋 View Assignments"** tab
6. ✅ Verify the entity appears in the "Entities Assigned" section

---

### Phase 4: Test Multi-Sheet Routing

#### Test 4.1: Upload Receipt (User with Assignment)
1. **Log in** as a user who was assigned to "Test Sheet A"
2. Navigate to: https://financialanaliyst.web.app
3. **Upload a receipt** (any image)
4. ✅ Verify the receipt is processed
5. **Open "Test Sheet A"** (the one you assigned to this user)
6. ✅ Verify the receipt data appears in this sheet (not the default sheet)

#### Test 4.2: Upload Receipt (User without Assignment)
1. **Log in** as a different user (not assigned to any specific sheet)
2. Navigate to: https://financialanaliyst.web.app
3. **Upload a receipt**
4. ✅ Verify the receipt is processed
5. **Open the "Default Sheet"**
6. ✅ Verify the receipt data appears in the default sheet

#### Test 4.3: Entity-Level Routing
1. **Log in** as a user who belongs to an entity that was assigned a sheet
2. **Upload a receipt**
3. ✅ Verify the receipt goes to the entity's assigned sheet

---

### Phase 5: Test Deletion and Removal

#### Test 5.1: Remove User Assignment
1. As admin, go to **Sheet Management**
2. Click **👥 Assign** on a config
3. Note the assigned users
4. In **View Assignments** tab, verify users are listed
5. **Close the modal**
6. **To remove**: Need to use Firebase Console or implement UI button
   - For now, manually remove `sheetConfigId` from user doc in Firestore

#### Test 5.2: Delete Sheet Config
1. Find the "Test Sheet A" config
2. Click **🗑️ Delete**
3. Confirm the deletion
4. ✅ Verify the config disappears from the list
5. ✅ Verify the config status is set to "inactive" in Firestore (not hard deleted)

---

## 🔍 Verification in Firestore

After testing, check Firestore to verify data integrity:

### Check Sheet Configs
```
Collection: sheet_configs
```
- ✅ Should have your configs with proper fields
- ✅ Deleted configs should have `status: "inactive"`

### Check User Assignments
```
Collection: users/{userId}
Field: sheetConfigId
```
- ✅ Assigned users should have `sheetConfigId` field set
- ✅ Unassigned users should have `sheetConfigId: null` or missing

### Check Entity Assignments
```
Collection: entities/{entityId}
Field: sheetConfigId
```
- ✅ Assigned entities should have `sheetConfigId` field set

### Check Batch Documents
```
Collection: batches
```
- ✅ New receipts should have `googleSheetId` field
- ✅ `googleSheetId` should match the user's assigned sheet

---

## 🐛 Troubleshooting

### "Access Denied" on admin-sheets.html
- Make sure you're logged in as an admin
- Check `admins` collection in Firestore
- Sign out and sign back in to refresh claims

### "No sheet configurations found"
- Create a default config in Firestore (see Phase 1)
- Check that `sheet_configs` collection exists
- Verify `status: "active"` is set

### Sheet Health Check Fails
- Verify the Google Sheet ID is correct
- Make sure the sheet is shared with:
  - `financial-output@financialanaliyst.iam.gserviceaccount.com`
- Check that the service account has Editor permissions

### Receipt Goes to Wrong Sheet
- Check user's `sheetConfigId` in Firestore
- Check entity's `sheetConfigId` if user belongs to entity
- Verify default sheet has `isDefault: true`
- Check Cloud Function logs for routing decisions

### "Sheet assignment removed successfully" but still assigned
- This was a known issue (now fixed)
- The removal functions now properly delegate to `sheet-config.ts`
- If you encounter this, clear browser cache and re-test

---

## 📊 Success Criteria

Phase 4 is fully functional when:

- ✅ Admin can create, edit, and delete sheet configurations
- ✅ Admin can verify sheet health
- ✅ Admin can assign sheets to users and entities
- ✅ Admin can view current assignments
- ✅ Receipts are routed to user-specific sheets
- ✅ Receipts are routed to entity-level sheets
- ✅ Unassigned users use the default sheet
- ✅ All CRUD operations work without errors
- ✅ UI is responsive and intuitive
- ✅ No console errors in browser or Cloud Functions logs

---

## 📝 Next Steps

1. **Complete Testing**: Go through all phases above
2. **Create Entities**: Add entities in Firestore if needed for testing
3. **Test with Real Users**: Invite team members to test multi-sheet routing
4. **Monitor Logs**: Check Cloud Functions logs for any issues
5. **Create Documentation**: Update user guide with sheet management instructions

---

## 🆘 Getting Help

If you encounter any issues:

1. **Check Browser Console** (F12) for JavaScript errors
2. **Check Firebase Console** → Functions → Logs for backend errors
3. **Verify Firestore Data** is structured correctly
4. **Check Service Account Permissions** on Google Sheets

---

**Phase 4 Status**: ✅ **DEPLOYED & READY FOR TESTING**

**Deployment Date**: December 17, 2025  
**Branch**: `feature/phase-4-multi-sheet-management`  
**Backend Functions**: 11 deployed  
**Frontend Pages**: 1 new (admin-sheets.html)

