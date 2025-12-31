# Debug: Configs Not Loading in Emulator

## Issue
Configs are being created but not showing up in the list (0 configs loaded).

## Possible Causes

1. **Functions using production Firestore instead of emulator**
2. **Configs being saved but query failing silently**
3. **Functions not rebuilt after code changes**

## Debug Steps

### Step 1: Check Emulator UI

1. Go to: http://127.0.0.1:4000
2. Click **"Firestore"** tab
3. Check if `sheet_configs` collection exists
4. Check if any documents are in it

### Step 2: Check Function Logs

In the terminal running `firebase emulators:start`, look for:
- `[Admin Sheet] Fetching all configs`
- `[Sheet Config] Found X active sheet configs`
- Any error messages

### Step 3: Rebuild Functions

The functions might need to be rebuilt after code changes:

```powershell
cd functions
npm run build
cd ..
```

Then restart emulators:
```powershell
# Stop (Ctrl+C)
firebase emulators:start
```

### Step 4: Check if Functions Are Using Emulator

The Firebase Admin SDK should automatically detect the emulator when running in the functions emulator. But verify:

1. Functions emulator is running on port 5001
2. Firestore emulator is running on port 8080
3. Both are started together with `firebase emulators:start`

### Step 5: Test Direct Query

Run the diagnostic script to see what's in Firestore:

```powershell
$env:FIRESTORE_EMULATOR_HOST = "localhost:8080"
node check-sheet-configs.js
```

If this shows 0 configs, the configs aren't being saved to the emulator.

## Quick Fix: Test in Production

If emulator testing is problematic, test against production:

1. **Remove emulator variable** (or don't set it)
2. **Refresh admin-sheets page**
3. **Configs should load** (the 5 we saw earlier)

The code fixes will work in both emulator and production.

---

**Most likely**: Functions need to be rebuilt, or the emulator UI will show if configs are actually being saved.

