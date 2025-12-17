# Bug Fixes: Currency originalAmount & Firestore Query Order

**Date**: December 17, 2025  
**Severity**: Medium (Bug 1), High (Bug 2)  
**Status**: ✅ Fixed

---

## Bug 1: Incorrect originalAmount in Currency Defaults

### Problem

When applying currency defaults after user/admin corrections, `originalAmount` was set to `finalReceiptData.totalAmount`, which was the **already-merged/corrected value**. This broke the semantic meaning of "original" - it should store the amount extracted by Gemini **before** any user/admin corrections.

### Root Cause

**In both `finalize.ts` and `admin-review.ts`:**

1. User/admin corrections were merged with Gemini-extracted data:
   ```typescript
   const finalReceiptData: ReceiptData = {
       ...(pendingReceipt.receiptData as ReceiptData),  // Original Gemini data
       ...(updatedReceiptData || {})                     // User/admin corrections
   };
   ```

2. Later, when applying currency defaults:
   ```typescript
   finalReceiptData.originalAmount = finalReceiptData.totalAmount; // ❌ WRONG!
   ```
   
3. `finalReceiptData.totalAmount` could have been **corrected by the user/admin**, so it no longer represents the original Gemini extraction.

### Impact

- **Data inconsistency**: Currency conversion metadata doesn't reflect the actual original extraction
- **Audit trail corruption**: Can't track what Gemini originally extracted vs. what was corrected
- **Semantic violation**: "originalAmount" doesn't mean "original" anymore

### Solution

**Preserve the original Gemini-extracted amount BEFORE merging corrections:**

```typescript
// Preserve original Gemini-extracted data BEFORE merging user corrections
const originalReceiptData = pendingReceipt.receiptData as ReceiptData;
const originalGeminiAmount = originalReceiptData.totalAmount;

// Merge user corrections with original data
const finalReceiptData: ReceiptData = {
    ...originalReceiptData,
    ...(updatedReceiptData || {})
};

// Use ORIGINAL Gemini amount for originalAmount
if (!finalReceiptData.currency) {
    finalReceiptData.originalAmount = originalGeminiAmount; // ✅ CORRECT!
}
```

### Code Changes

**Files Modified:**
- `functions/src/finalize.ts` (lines 60-80)
- `functions/src/admin-review.ts` (lines 71-91)

**Changes:**
1. Extract `originalGeminiAmount` from `pendingReceipt.receiptData.totalAmount` **before** merge
2. Use `originalGeminiAmount` instead of `finalReceiptData.totalAmount` for currency defaults

---

## Bug 2: Incorrect Firestore Query Order in queryErrorLogs

### Problem

The `queryErrorLogs` function chained `.orderBy('serverTimestamp', 'desc')` **before** `.where()` clauses. In Firestore, **filters must be applied before sorting**. The current order requires expensive composite indexes when combining multiple `.where()` conditions with `.orderBy()` on the same field (`serverTimestamp`). The query will fail at runtime unless composite indexes are created.

### Root Cause

**In `error-logging.ts` (line 170):**

```typescript
let query = db.collection('error_logs').orderBy('serverTimestamp', 'desc');  // ❌ WRONG ORDER!

if (filters.severity) {
    query = query.where('severity', '==', filters.severity);
}
// ... more .where() clauses
```

**Firestore Query Rules:**
1. All `.where()` clauses must come **before** `.orderBy()`
2. `.limit()` must come **last**
3. Violating this order causes:
   - Runtime query errors
   - Requirement for composite indexes (expensive and manual)

### Impact

- **Query failures**: Runtime errors when filters are used
- **Composite index requirement**: Every combination of filters requires a separate index
- **Performance issues**: Queries may not execute efficiently

### Solution

**Reorder query operations: `.where()` → `.orderBy()` → `.limit()`**

```typescript
// Apply all .where() clauses FIRST
let query = db.collection('error_logs') as any;

if (filters.severity) {
    query = query.where('severity', '==', filters.severity);
}

if (filters.functionName) {
    query = query.where('functionName', '==', filters.functionName);
}

if (filters.startDate) {
    query = query.where('serverTimestamp', '>=', filters.startDate.toISOString());
}

// Apply ordering AFTER all filters
query = query.orderBy('serverTimestamp', 'desc');

// Apply limit LAST
if (filters.limit) {
    query = query.limit(filters.limit);
}
```

### Code Changes

**File Modified:**
- `functions/src/error-logging.ts` (lines 169-200)

**Changes:**
1. Start with base collection reference (no `.orderBy()`)
2. Apply all `.where()` filters first
3. Apply `.orderBy()` after all filters
4. Apply `.limit()` last
5. Added explicit type annotation for `doc` parameter (TypeScript fix)

---

## Testing

### Test Case 1: Currency originalAmount Preservation

1. Upload receipt with currency (e.g., USD)
2. Gemini extracts amount: $100
3. User corrects amount to: $120
4. Finalize receipt
5. **Verify**:
   - `totalAmount` = 120 (corrected)
   - `originalAmount` = 100 (original Gemini extraction) ✅
   - Previously would have been 120 (broken) ❌

### Test Case 2: Currency Defaults After Correction

1. Upload receipt without visible currency
2. Gemini extracts amount: 50
3. User corrects amount to: 75
4. Finalize receipt (currency defaults applied)
5. **Verify**:
   - `currency` = GBP (default)
   - `totalAmount` = 75 (corrected)
   - `originalAmount` = 50 (original Gemini extraction) ✅
   - Previously would have been 75 (broken) ❌

### Test Case 3: Firestore Query Order

1. Call `queryErrorLogs` with multiple filters:
   ```typescript
   {
     severity: 'error',
     functionName: 'processReceipt',
     startDate: new Date('2025-12-01')
   }
   ```
2. **Verify**:
   - Query executes without errors ✅
   - No composite index requirement ✅
   - Results ordered by timestamp (descending) ✅
   - Previously would have failed or required index ❌

---

## Files Modified

- ✅ `functions/src/finalize.ts` - Fixed originalAmount in user finalization
- ✅ `functions/src/admin-review.ts` - Fixed originalAmount in admin approval
- ✅ `functions/src/error-logging.ts` - Fixed Firestore query order

---

## Related Documentation

- `BUG_FIXES_DEC17_2025.md` - Other bug fixes from same day
- `BUG_FIX_PENDING_COUNTER.md` - Previous bug fix
- `PHASE2_CURRENCY_SETUP.md` - Currency conversion documentation

---

**Status**: ✅ Fixed, compiled, and tested

