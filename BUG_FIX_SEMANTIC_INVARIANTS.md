# Bug Fixes: Semantic Invariants & Firestore Query Optimization

**Date**: December 17, 2025  
**Severity**: High (Bug 1), Critical (Bug 2)  
**Status**: ✅ Fixed

---

## Bug 1: Firestore Composite Index Requirement in queryErrorLogs

### Problem

The `queryErrorLogs` function applied multiple range filters (`>=` and `<=`) on the same field (`serverTimestamp`) before ordering by that field in descending order. When both `startDate` and `endDate` filters are used together with other equality filters, Firestore requires a composite index to be created manually.

**Impact:**
- Runtime query errors in production unless composite index is pre-configured
- Filtering by date range fails silently or throws exceptions
- Poor developer experience requiring manual index management

### Root Cause

**In `error-logging.ts` (lines 186-195):**

```typescript
if (filters.startDate) {
    query = query.where('serverTimestamp', '>=', filters.startDate.toISOString());
}

if (filters.endDate) {
    query = query.where('serverTimestamp', '<=', filters.endDate.toISOString());
}

// Apply ordering AFTER all filters
query = query.orderBy('serverTimestamp', 'desc'); // ❌ Requires composite index!
```

When Firestore has range filters on a field, it must order by that field first. Ordering in a different direction than the natural order requires composite indexes.

### Solution

**Strategy:** Use ascending order when range filters exist (natural Firestore order), then reverse results in memory to achieve descending order without requiring composite indexes.

```typescript
// Bug Fix: When using range filters on serverTimestamp, orderBy must be on the same field
// This avoids composite index requirement by ordering by the range-filtered field
let hasTimestampFilter = false;

if (filters.startDate) {
    query = query.where('serverTimestamp', '>=', filters.startDate.toISOString());
    hasTimestampFilter = true;
}

if (filters.endDate) {
    query = query.where('serverTimestamp', '<=', filters.endDate.toISOString());
    hasTimestampFilter = true;
}

// When range filters exist, use ascending order (natural Firestore order)
// Then reverse results in memory to get descending order
if (hasTimestampFilter) {
    query = query.orderBy('serverTimestamp', 'asc'); // ✅ No composite index needed!
} else {
    query = query.orderBy('serverTimestamp', 'desc'); // Descending when no range filters
}

// ... later in code ...

// Reverse results if we used ascending order due to range filters
if (hasTimestampFilter) {
    logs.reverse(); // Achieve descending order in memory
}
```

**Benefits:**
- ✅ No composite index required
- ✅ Works immediately in all environments
- ✅ Minimal performance impact (in-memory reverse is fast)
- ✅ Maintains expected behavior (newest logs first)

---

## Bug 2: Semantic Invariant Violation in Currency Defaults

### Problem

When applying currency defaults for receipts where Gemini failed to extract currency, `originalAmount` was set to the original Gemini-extracted amount (`originalGeminiAmount`). However, if the user or admin corrected the `totalAmount` via `updatedReceiptData`, this created an inconsistent state where `originalAmount` did not represent the actual pre-conversion amount.

**Example Scenario:**
1. Gemini extracts: `totalAmount = 100`
2. Admin corrects to: `totalAmount = 120`
3. Currency defaults applied:
   - `originalAmount = 100` (Gemini's original) ❌ **WRONG!**
   - `totalAmount = 120` (admin's correction)
   - `exchangeRate = 1.0`
   - **Violation:** `originalAmount * exchangeRate ≠ totalAmount` (100 * 1.0 ≠ 120)

**Impact:**
- Semantic invariant violation: `originalAmount * exchangeRate ≈ totalAmount` is false
- Data integrity issues in currency conversion tracking
- Accountant reports show incorrect pre-conversion amounts
- Cannot reliably audit currency conversions

### Root Cause

**In `finalize.ts` (lines 82) and `admin-review.ts` (line 93):**

```typescript
const originalGeminiAmount = originalReceiptData.totalAmount; // Before corrections

// Later...
if (!finalReceiptData.currency) {
    finalReceiptData.originalAmount = originalGeminiAmount; // ❌ Uses pre-correction amount
    finalReceiptData.exchangeRate = 1.0; // But no actual conversion!
}
```

The code preserved the Gemini-extracted amount even though:
- The user/admin may have corrected `totalAmount`
- `exchangeRate = 1.0` indicates **no currency conversion occurred**
- The semantic meaning of `originalAmount` is "amount before conversion", not "amount before user correction"

### Solution

When `exchangeRate = 1.0` (no conversion), `originalAmount` must equal the **final corrected** `totalAmount` to maintain the semantic invariant.

```typescript
const baseCurrency = process.env.BASE_CURRENCY || 'GBP';
if (!finalReceiptData.currency) {
    console.log(`Currency missing in receipt ${receiptId}, applying defaults: ${baseCurrency}`);
    finalReceiptData.currency = baseCurrency;
    finalReceiptData.originalCurrency = baseCurrency;
    // Use final corrected amount (not Gemini's original) since exchangeRate=1.0 means no conversion
    finalReceiptData.originalAmount = finalReceiptData.totalAmount; // ✅ CORRECT!
    finalReceiptData.exchangeRate = 1.0;
    finalReceiptData.conversionDate = new Date().toISOString();
}
```

**Semantic Invariant Preserved:**
- `originalAmount * exchangeRate = totalAmount`
- `120 * 1.0 = 120` ✅

**Rationale:**
- `originalAmount` represents "amount before currency conversion", not "amount before user corrections"
- When `exchangeRate = 1.0`, there is **no conversion**, so original and final amounts must be equal
- User/admin corrections are **data quality fixes**, not currency conversions
- The invariant `originalAmount * exchangeRate ≈ totalAmount` must always hold

---

## Testing

### Test Case 1: Date Range Query Without Composite Index

```typescript
// Query with date range
const logs = await queryErrorLogs({
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-17'),
    limit: 50
});

// Expected: Query succeeds without requiring composite index
// Expected: Results ordered by timestamp (newest first)
// Expected: All logs within date range returned
```

**Before Fix:** ❌ Requires composite index or fails  
**After Fix:** ✅ Works immediately without index

### Test Case 2: Currency Defaults After User Correction

```typescript
// Scenario:
// 1. Gemini extracts: totalAmount = 100, currency = undefined
// 2. User corrects to: totalAmount = 120
// 3. Finalize receipt (currency defaults applied)

// Expected Result:
{
    totalAmount: 120,           // User's correction
    currency: 'GBP',           // Default applied
    originalCurrency: 'GBP',   // Same as currency
    originalAmount: 120,       // ✅ Equals totalAmount (not 100!)
    exchangeRate: 1.0          // No conversion
}

// Invariant Check:
originalAmount * exchangeRate === totalAmount
120 * 1.0 === 120 ✅
```

**Before Fix:** ❌ `originalAmount = 100`, invariant violated  
**After Fix:** ✅ `originalAmount = 120`, invariant preserved

### Test Case 3: Currency Defaults After Admin Correction

```typescript
// Scenario:
// 1. Gemini extracts: totalAmount = 50, currency = undefined
// 2. Admin corrects to: totalAmount = 75
// 3. Admin approves receipt (currency defaults applied)

// Expected Result:
{
    totalAmount: 75,           // Admin's correction
    currency: 'GBP',          // Default applied
    originalCurrency: 'GBP',  // Same as currency
    originalAmount: 75,       // ✅ Equals totalAmount (not 50!)
    exchangeRate: 1.0         // No conversion
}

// Invariant Check:
originalAmount * exchangeRate === totalAmount
75 * 1.0 === 75 ✅
```

**Before Fix:** ❌ `originalAmount = 50`, invariant violated  
**After Fix:** ✅ `originalAmount = 75`, invariant preserved

---

## Files Modified

- ✅ `functions/src/error-logging.ts` - Fixed Firestore query ordering
- ✅ `functions/src/finalize.ts` - Fixed currency default semantic invariant
- ✅ `functions/src/admin-review.ts` - Fixed currency default semantic invariant

---

## Code Changes Summary

### functions/src/error-logging.ts

**Changed Lines:** 172-220

- Added `hasTimestampFilter` flag to track when range filters are used
- Use ascending order when range filters exist (natural Firestore order)
- Use descending order when no range filters (preserves existing behavior)
- Reverse results in memory when ascending order was used

### functions/src/finalize.ts

**Changed Lines:** 60-84

- Removed `originalGeminiAmount` variable (no longer needed)
- Changed `originalAmount` assignment from `originalGeminiAmount` to `finalReceiptData.totalAmount`
- Updated comments to explain semantic invariant preservation

### functions/src/admin-review.ts

**Changed Lines:** 71-96

- Removed `originalGeminiAmount` variable (no longer needed)
- Changed `originalAmount` assignment from `originalGeminiAmount` to `finalReceiptData.totalAmount`
- Updated comments to explain semantic invariant preservation

---

## Related Documentation

- `BUG_FIXES_DEC17_2025.md` - Other bug fixes from same day
- `BUG_FIX_CURRENCY_AND_QUERY.md` - Previous currency bug fix
- `PHASE2_CURRENCY_SETUP.md` - Currency conversion documentation

---

**Status**: ✅ Fixed, compiled, and tested

