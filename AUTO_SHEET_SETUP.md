# Automatic Sheet Setup - Phase 4

**Status**: ✅ **IMPLEMENTED**

---

## 🎯 What It Does

When a new entity is created in Firestore, the system **automatically**:

1. ✅ Creates a new Google Sheet with proper headers
2. ✅ Shares sheet with service account
3. ✅ Creates sheet config in Firestore
4. ✅ Assigns sheet to the entity

**Result**: New businesses get their own sheet automatically - no manual setup needed!

---

## 🚀 How It Works

### Trigger
- **Event**: Document created in `/entities` collection
- **Function**: `autoSetupEntitySheet`
- **Region**: `us-central1`

### Process Flow

```
New Entity Created
    ↓
autoSetupEntitySheet Triggered
    ↓
1. Create Google Sheet (with headers)
    ↓
2. Share with service account
    ↓
3. Create sheet config in Firestore
    ↓
4. Assign config to entity
    ↓
✅ Entity ready to receive receipts!
```

---

## ⚙️ Configuration

### Enable/Disable

The function runs automatically when entities are created. To skip auto-setup:

1. **Set `testData: true`** on entity (skips auto-setup)
2. **Manually assign `sheetConfigId`** before creating entity
3. **Disable the function** (comment out export in `index.ts`)

### Service Account Permissions

The service account needs:
- ✅ Google Sheets API access (already have)
- ✅ Google Drive API access (for creating/sharing sheets)

---

## 📋 What Gets Created

### Google Sheet
- **Name**: `{Entity Name} - Receipts`
- **Tabs**: 
  - Main tab: "Sheet1" (with all headers)
  - Accountant tab: "Accountant_CSV_Ready"
- **Headers**: Pre-configured with all Phase 1-3 columns

### Sheet Config
- **Name**: `{Entity Name} - Receipts`
- **Status**: `active`
- **Assigned to**: Entity (all users in entity use this sheet)
- **Stats**: Initialized with `totalReceipts: 0`

### Entity Document
- **Updated with**:
  - `sheetConfigId`: Reference to config
  - `autoSheetCreated`: `true`
  - `autoSheetCreatedAt`: Timestamp
  - `autoSheetUrl`: Link to sheet

---

## 🧪 Testing

### Test 1: Create New Entity

1. Go to Emulator UI → Firestore
2. Create new entity:
   ```
   Collection: entities
   Document ID: test-business-1
   Fields:
     name: "Test Business 1"
     createdAt: (timestamp)
   ```
3. **Watch logs** - should see:
   ```
   [Auto Sheet] 🚀 Auto-setting up sheet for entity: Test Business 1
   [Auto Sheet] Creating Google Sheet: Test Business 1 - Receipts
   [Auto Sheet] ✅ Sheet shared with service account
   [Auto Sheet] Creating sheet config...
   [Auto Sheet] Assigning sheet to entity...
   [Auto Sheet] ✅ Auto-setup complete
   ```
4. **Check Firestore**:
   - Entity should have `sheetConfigId`
   - `sheet_configs` collection should have new config
   - Config should have real `sheetId` (not placeholder)
5. **Check Google Drive**:
   - New sheet should exist: "Test Business 1 - Receipts"

### Test 2: Skip Auto-Setup (Test Data)

1. Create entity with `testData: true`:
   ```
   name: "Test Business 2"
   testData: true
   ```
2. **Verify**: Auto-setup is skipped (check logs)

### Test 3: Entity Already Has Sheet

1. Create entity with `sheetConfigId` already set
2. **Verify**: Auto-setup is skipped

---

## 🔍 Monitoring

### Check Logs

```bash
firebase functions:log --only autoSetupEntitySheet
```

### Check Entity Status

In Firestore, entity document will have:
- `autoSheetCreated: true` - Success
- `autoSheetError: "error message"` - Failed
- `autoSheetUrl: "https://..."` - Sheet link

---

## 🐛 Troubleshooting

### Sheet Not Created

**Check**:
- ✅ Service account has Drive API access
- ✅ `GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY` env variable set
- ✅ Function logs for errors

### Sheet Created But Not Assigned

**Check**:
- ✅ Firestore write permissions
- ✅ Entity document exists
- ✅ Function logs for assignment step

### Duplicate Sheets

**Prevention**:
- Function checks if entity already has `sheetConfigId`
- Won't create duplicate if entity already has sheet

---

## 📝 Manual Override

If auto-setup fails, admin can:

1. **Create sheet manually** via Sheet Management UI
2. **Assign to entity** via Sheet Management UI
3. **Or fix the error** and entity will use the manually created sheet

---

## ✅ Benefits

1. **Zero Manual Setup** - New businesses get sheets automatically
2. **Consistent Configuration** - All sheets have same headers/structure
3. **Immediate Usability** - Entity ready to receive receipts right away
4. **Error Handling** - Logs errors but doesn't break entity creation

---

## 🔮 Future Enhancements

- [ ] Auto-create sheets for users (not just entities)
- [ ] Custom sheet templates per business type
- [ ] Sheet naming customization
- [ ] Notification when sheet is created

---

**Status**: ✅ **READY FOR TESTING**

Deploy the function and test by creating a new entity!

