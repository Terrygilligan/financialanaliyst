# Quick Test Setup - Phase 4 Multi-Business Testing

## 🚀 Fast Setup (5 minutes)

### Step 1: Set Emulator Environment

```powershell
$env:FIRESTORE_EMULATOR_HOST = "localhost:8080"
```

### Step 2: Run Setup Script

```powershell
node setup-test-businesses.js
```

This creates:
- ✅ 3 test entities (Business A, B, C)
- ✅ 3 user documents
- ✅ 3 sheet configs (with placeholder IDs)

### Step 3: Create Google Sheets

For each business, create a Google Sheet and share with:
`<SERVICE_ACCOUNT_EMAIL>`

### Step 4: Update Sheet IDs

Go to Emulator UI → Firestore → `sheet_configs`:
- Replace `PLACEHOLDER-business-a` with actual Sheet ID
- Replace `PLACEHOLDER-business-b` with actual Sheet ID  
- Replace `PLACEHOLDER-business-c` with actual Sheet ID

### Step 5: Create Auth Users

Go to http://127.0.0.1:4000 → Authentication:
- Add: `terry@business-a.com`
- Add: `admin@business-b.com`
- Add: `demo@business-c.com`

### Step 6: Test!

1. Log in as Business A user → Upload receipt → Check Business A Sheet
2. Log in as Business B user → Upload receipt → Check Business B Sheet
3. Verify receipts stay separate!

---

**Full guide**: See [PHASE4_TEST_SETUP.md](PHASE4_TEST_SETUP.md)

