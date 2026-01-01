# DEPRECATED: Phase 4 Multi-Sheet Management - Testing Plan

> ⚠️ **IMPORTANT**: The Google Sheets and Google Drive integration described in this document is **DEPRECATED**. 
> All multi-sheet logic and legacy API dependencies have been removed in favor of **Firestore Business Silos**.
> Please refer to `AGENTS.md` for the current architectural "Golden Rules".

**Status**: DEPRECATED  
**Estimated Time**: 2-3 hours

---

## 🎯 Testing Objectives

1. Verify sheet configuration CRUD operations work
2. Verify sheet routing works correctly (user → entity → default → env)
3. Verify sheet health checks work
4. Verify user/entity assignments work
5. Verify backward compatibility (existing workflow)
6. Verify statistics tracking works

---

## 📋 Pre-Testing Setup

### 1. Environment Preparation
- [ ] Deploy functions to Firebase
- [ ] Deploy frontend to Firebase Hosting
- [ ] Verify admin access (Custom Claims or Firestore admins collection)
- [ ] Have 2-3 test Google Sheets ready
- [ ] Share all test sheets with service account: `<SERVICE_ACCOUNT_EMAIL>`

### 2. Test Data Setup
- [ ] Create 2-3 test users in Firebase Auth
- [ ] Create 1-2 test entities in Firestore (`/entities`)
- [ ] Assign users to entities (update `/businesses/{businessId}/users/{userId}` with `entity` field)

---

## 🧪 Test Cases

### Test 1: Admin Access & UI Loading

**Objective**: Verify admin can access Sheet Management page

**Steps**:
1. Log in as admin user
2. Navigate to Admin Dashboard
3. Click "Sheet Management" link
4. Verify page loads without errors
5. Verify "No sheet configurations found" message appears (if none exist)

**Expected Results**:
- ✅ Page loads successfully
- ✅ Admin authentication check passes
- ✅ Empty state message displays if no configs exist

**Status**: [ ] Pass [ ] Fail

---

### Test 2: Create Sheet Configuration (Existing Sheet)

**Objective**: Verify admin can create a sheet config from existing Google Sheet

**Steps**:
1. Go to Sheet Management page
2. Click "+ Create New Sheet Config"
3. Select "Use existing Google Sheet" mode
4. Enter:
   - Name: "Test Sheet 1"
   - Sheet ID: (from existing test sheet)
   - Main Tab: "Sheet1" (or leave blank)
   - Accountant Tab: "Accountant_CSV_Ready" (or leave blank)
   - Default: Checked
5. Click "Verify Sheet" button
6. Verify health check passes
7. Click "Save Configuration"

**Expected Results**:
- ✅ Modal opens correctly
- ✅ Health check shows success (green checkmarks)
- ✅ Configuration saved successfully
- ✅ Success message appears
- ✅ New config appears in list
- ✅ Config marked as "Default"

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 3: Create Sheet Configuration (New Sheet)

**Objective**: Verify admin can create a new Google Sheet via UI

**Steps**:
1. Click "+ Create New Sheet Config"
2. Select "Create new Google Sheet" mode
3. Enter:
   - Name: "Test Sheet 2"
   - Main Tab: (optional)
   - Accountant Tab: "Accountant_CSV_Ready"
   - Default: Unchecked
4. Click "Save Configuration"
5. Wait for sheet creation (may take 10-20 seconds)

**Expected Results**:
- ✅ Sheet creation starts
- ✅ Loading indicator shows
- ✅ New Google Sheet created
- ✅ Sheet automatically shared with service account
- ✅ Configuration saved with new sheet ID
- ✅ Success message appears
- ✅ Option to open sheet in new tab

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 4: Sheet Health Check

**Objective**: Verify sheet health verification works

**Steps**:
1. Create a sheet config with a valid sheet ID
2. Click "🔍 Health" button on the config card
3. Verify health check results

**Test Cases**:
- **Valid Sheet**: Should show ✅ accessible, permissions OK, tabs exist
- **Invalid Sheet ID**: Should show ❌ error message
- **Sheet Not Shared**: Should show ❌ permission error

**Expected Results**:
- ✅ Health check modal/alert shows correct status
- ✅ Error messages are clear and actionable
- ✅ Service account email shown in error messages

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 5: Assign Sheet to Entity

**Objective**: Verify entity-level sheet assignment works

**Steps**:
1. Create a sheet config (not default)
2. Click "👥 Assign" button
3. Go to "Assign to Entities" tab
4. Select a test entity from dropdown
5. Click "Assign Entity"
6. Confirm assignment
7. Verify assignment appears in "View Current Assignments" tab

**Expected Results**:
- ✅ Entity dropdown populated with entities
- ✅ Assignment succeeds
- ✅ Success message appears
- ✅ Entity appears in assignments list
- ✅ Entity document updated in Firestore (`/entities/{entityId}.sheetConfigId`)

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 6: Assign Sheet to User

**Objective**: Verify user-level sheet assignment works (overrides entity)

**Steps**:
1. Create a sheet config
2. Click "👥 Assign" button
3. Go to "Assign to Users" tab
4. Select one or more test users (Ctrl/Cmd+click for multiple)
5. Click "Assign Selected Users"
6. Confirm assignment
7. Verify assignment appears in "View Current Assignments" tab

**Expected Results**:
- ✅ User list populated
- ✅ Multiple selection works
- ✅ Assignment succeeds
- ✅ Success message shows count of assigned users
- ✅ Users appear in assignments list
- ✅ User documents updated in Firestore (`/businesses/{businessId}/users/{userId}.sheetConfigId`)

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 7: Sheet Routing Priority (User Override)

**Objective**: Verify user-specific assignment overrides entity assignment

**Setup**:
- User A belongs to Entity X
- Entity X assigned to Sheet 1
- User A assigned to Sheet 2

**Steps**:
1. Upload receipt as User A
2. Check which sheet receives the receipt

**Expected Results**:
- ✅ Receipt goes to Sheet 2 (user override)
- ✅ Not Sheet 1 (entity assignment)
- ✅ Logs show user-specific config used

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 8: Sheet Routing Priority (Entity Assignment)

**Objective**: Verify entity assignment works when user has no override

**Setup**:
- User B belongs to Entity Y
- Entity Y assigned to Sheet 3
- User B has no direct assignment

**Steps**:
1. Upload receipt as User B
2. Check which sheet receives the receipt

**Expected Results**:
- ✅ Receipt goes to Sheet 3 (entity assignment)
- ✅ Logs show entity-level config used

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 9: Sheet Routing Priority (Default Config)

**Objective**: Verify default config is used when no user/entity assignment

**Setup**:
- User C has no entity and no direct assignment
- Default sheet config points to Sheet 4

**Steps**:
1. Upload receipt as User C
2. Check which sheet receives the receipt

**Expected Results**:
- ✅ Receipt goes to Sheet 4 (default config)
- ✅ Logs show default config used

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 10: Sheet Routing Priority (Environment Fallback)

**Objective**: Verify environment variable fallback works

**Setup**:
- User D has no entity, no assignment, and no default config exists
- `GOOGLE_SHEET_ID` environment variable set to Sheet 5

**Steps**:
1. Upload receipt as User D
2. Check which sheet receives the receipt

**Expected Results**:
- ✅ Receipt goes to Sheet 5 (env variable)
- ✅ Logs show "falling back to environment variable"
- ✅ No errors thrown

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 11: Statistics Tracking

**Objective**: Verify sheet statistics update after receipt write

**Steps**:
1. Note current `totalReceipts` count for a sheet config
2. Upload a receipt that routes to that sheet
3. Wait for processing to complete
4. Check sheet config stats in Firestore or UI

**Expected Results**:
- ✅ `stats.totalReceipts` incremented by 1
- ✅ `stats.lastReceiptAt` updated to current timestamp
- ✅ Stats visible in admin UI

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 12: Edit Sheet Configuration

**Objective**: Verify admin can update existing sheet config

**Steps**:
1. Click "✏️ Edit" on an existing config
2. Change the name
3. Change tab names
4. Toggle default checkbox
5. Save changes

**Expected Results**:
- ✅ Modal opens with current values
- ✅ Changes save successfully
- ✅ Updated values appear in list
- ✅ If set as default, other defaults are unset

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 13: Delete Sheet Configuration

**Objective**: Verify soft delete works (sets status to inactive)

**Steps**:
1. Click "🗑️ Delete" on a config
2. Confirm deletion
3. Verify config disappears from list
4. Check Firestore - config should have `status: 'inactive'`

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Config removed from active list
- ✅ Config still exists in Firestore with `status: 'inactive'`
- ✅ Cannot delete if it's the only default config

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 14: Bulk User Assignment

**Objective**: Verify bulk assignment works for multiple users

**Steps**:
1. Create a sheet config
2. Go to "Assign to Users" tab
3. Select 5+ users (Ctrl/Cmd+click)
4. Click "Assign Selected Users"
5. Verify all users assigned

**Expected Results**:
- ✅ Multiple users can be selected
- ✅ Bulk assignment succeeds
- ✅ Success message shows count
- ✅ All users appear in assignments list
- ✅ Partial failures reported if any

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 15: Backward Compatibility (Legacy Workflow)

**Objective**: Verify existing single-sheet workflow still works

**Setup**:
- No sheet configs exist in Firestore
- `GOOGLE_SHEET_ID` environment variable set

**Steps**:
1. Upload a receipt as any user
2. Verify receipt appears in the sheet from `GOOGLE_SHEET_ID`

**Expected Results**:
- ✅ Receipt processes successfully
- ✅ Receipt appears in correct sheet
- ✅ No errors in logs
- ✅ Works exactly as before Phase 4

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 16: Review Workflow Integration

**Objective**: Verify sheet routing works in review workflow

**Setup**:
- `ENABLE_REVIEW_WORKFLOW=true`
- User assigned to specific sheet
- Upload receipt (goes to pending)

**Steps**:
1. Upload receipt (pending workflow)
2. User reviews and finalizes receipt
3. Verify receipt goes to correct sheet

**Expected Results**:
- ✅ Receipt routes to correct sheet after finalization
- ✅ Works with user/entity/default assignments
- ✅ Statistics update correctly

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 17: Admin Review Integration

**Objective**: Verify sheet routing works when admin approves receipt

**Setup**:
- Receipt in admin review queue
- User assigned to specific sheet

**Steps**:
1. Admin approves receipt from review queue
2. Verify receipt goes to correct sheet

**Expected Results**:
- ✅ Receipt routes to correct sheet after admin approval
- ✅ Works with user/entity/default assignments

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 18: Error Handling - Invalid Sheet ID

**Objective**: Verify graceful error handling for invalid sheet IDs

**Steps**:
1. Try to create config with invalid sheet ID
2. Try to verify health of invalid sheet
3. Verify error messages are clear

**Expected Results**:
- ✅ Validation errors shown for invalid IDs
- ✅ Health check shows clear error message
- ✅ No crashes or unhandled errors

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 19: Error Handling - Missing Permissions

**Objective**: Verify error handling when service account lacks permissions

**Steps**:
1. Create config with sheet ID that's not shared with service account
2. Try to verify health
3. Upload receipt that routes to that sheet

**Expected Results**:
- ✅ Health check shows permission error
- ✅ Receipt processing fails gracefully
- ✅ Error logged but doesn't crash system

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

### Test 20: Auto-Share Functionality

**Objective**: Verify auto-share button works

**Steps**:
1. Enter a Google Sheet ID in create modal
2. Click "Auto-Share with Service Account" button
3. Verify sharing succeeds

**Expected Results**:
- ✅ Button shows loading state
- ✅ Sharing succeeds
- ✅ Success message appears
- ✅ Sheet now accessible to service account

**Status**: [ ] Pass [ ] Fail

**Notes**: 
```
```

---

## 📊 Test Results Summary

**Total Tests**: 20  
**Passed**: ___ / 20  
**Failed**: ___ / 20  
**Blocked**: ___ / 20

**Critical Issues Found**: 
```
```

**Non-Critical Issues Found**:
```
```

**Overall Status**: [ ] ✅ Ready for Production [ ] ⚠️ Needs Fixes [ ] ❌ Not Ready

---

## 🔍 Additional Testing Scenarios

### Performance Testing
- [ ] Test with 10+ sheet configs
- [ ] Test with 50+ users assigned
- [ ] Test bulk assignment with 20+ users
- [ ] Verify lookup performance (should be fast with Firestore)

### Edge Cases
- [ ] User with entity but `useEntitySheet=false`
- [ ] Multiple default configs (should only allow one)
- [ ] Deleted config still referenced by user
- [ ] Sheet config with missing tabs

---

## 📝 Testing Notes

**Test Environment**: 
```
```

**Test Date**: 
```
```

**Tester**: 
```
```

**Issues Logged**: 
```
```

---

**Last Updated**: December 2025

