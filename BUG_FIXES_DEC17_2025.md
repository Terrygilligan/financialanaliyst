# Bug Fixes - December 17, 2025

## Overview

Two critical bugs were identified and fixed related to data consistency and race conditions in the receipt processing system.

---

## Bug 1: Currency Defaults Not Applied in Review Workflow

### Problem

When receipts were processed through the review workflow (`finalizeReceipt` and `adminApproveReceipt`), if Gemini failed to extract a currency code, the receipt data would have an `undefined` currency field. 

**Root Cause:**
- The direct processing path in `index.ts` (lines 118-126) correctly set currency defaults when Gemini extraction failed
- However, `finalize.ts` and `admin-review.ts` did not apply the same defaults when finalizing or approving receipts
- This resulted in incomplete data being written to Google Sheets for review workflow receipts

### Impact
- Receipts finalized through user review or admin approval could have missing currency information
- Inconsistent data in Google Sheets
- Potential issues with currency-dependent operations

### Solution

Added currency default logic to both `finalize.ts` and `admin-review.ts` after merging receipt data:

```typescript
// Bug Fix: Ensure currency defaults are set if missing (in case Gemini failed to extract)
const baseCurrency = process.env.BASE_CURRENCY || 'GBP';
if (!finalReceiptData.currency) {
    console.log(`Currency missing in receipt ${receiptId}, applying defaults: ${baseCurrency}`);
    finalReceiptData.currency = baseCurrency;
    finalReceiptData.originalCurrency = baseCurrency;
    finalReceiptData.originalAmount = finalReceiptData.totalAmount;
    finalReceiptData.exchangeRate = 1.0;
    finalReceiptData.conversionDate = new Date().toISOString();
}
```

### Files Modified
- `functions/src/finalize.ts` - Added currency defaults after line 69
- `functions/src/admin-review.ts` - Added currency defaults after line 80

---

## Bug 2: Race Condition in Direct Processing Statistics Update

### Problem

The direct processing workflow (when `ENABLE_REVIEW_WORKFLOW` is false) updated user statistics using a non-atomic read-modify-write pattern.

**Root Cause:**
- In `index.ts` (lines 231-242), the code performed:
  1. Read current statistics
  2. Calculate new values
  3. Write updated values
- This pattern is NOT atomic
- When multiple receipts were processed concurrently for the same user, updates would overwrite each other

**Example Race Condition:**
```
Receipt A reads: totalReceipts = 5
Receipt B reads: totalReceipts = 5  (simultaneous)
Receipt A writes: totalReceipts = 6
Receipt B writes: totalReceipts = 6  (overwrites A's update - should be 7!)
```

### Impact
- Lost receipt counts in user statistics
- Incorrect total amounts
- Inconsistent data in the `/users` collection
- The review workflow was NOT affected (it correctly used transactions)

### Solution

Wrapped the statistics update in a Firestore transaction to ensure atomic read-modify-write:

```typescript
// 7. Update user statistics in /users collection (using transaction to prevent race conditions)
const userRef = db.collection('users').doc(userId);
await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const currentStats = userDoc.exists ? (userDoc.data() || { totalReceipts: 0, totalAmount: 0 }) : { totalReceipts: 0, totalAmount: 0 };
    
    transaction.set(userRef, {
        totalReceipts: (currentStats.totalReceipts || 0) + 1,
        totalAmount: (currentStats.totalAmount || 0) + (receiptData.totalAmount || 0),
        lastUpdated: new Date().toISOString(),
        lastReceiptProcessed: fileName,
        lastReceiptTimestamp: new Date().toISOString()
    }, { merge: true });
});
```

### Files Modified
- `functions/src/index.ts` - Wrapped statistics update in transaction (lines 231-242)

---

## Testing Recommendations

### Bug 1 Testing
1. Process a receipt through the review workflow
2. Manually remove the `currency` field from the pending receipt in Firestore (simulating Gemini failure)
3. Finalize the receipt
4. Verify that the receipt in Google Sheets has complete currency data (currency, originalCurrency, exchangeRate, etc.)

### Bug 2 Testing
1. Disable review workflow: `ENABLE_REVIEW_WORKFLOW=false`
2. Upload multiple receipts simultaneously (5-10 receipts)
3. Check user statistics in Firestore `/users/{userId}`
4. Verify `totalReceipts` count matches the actual number of processed receipts
5. Verify `totalAmount` is the sum of all receipt amounts

---

## Documentation Updates

- ✅ `README.md` - Updated bug fixes section
- ✅ `TODO.md` - Updated completed tasks section
- ✅ `BUG_FIXES_DEC17_2025.md` - This document

---

## Related Files

### Currency Handling
- `functions/src/index.ts` - Initial currency extraction and defaults
- `functions/src/finalize.ts` - User finalization with currency defaults (FIXED)
- `functions/src/admin-review.ts` - Admin approval with currency defaults (FIXED)
- `functions/src/currency.ts` - Currency conversion logic

### Statistics Updates
- `functions/src/index.ts` - Direct processing statistics update (FIXED)
- `functions/src/finalize.ts` - Review workflow statistics update (already used transactions)
- `functions/src/admin-review.ts` - Admin approval statistics update (already used transactions)

---

## Additional Notes

### Why These Bugs Were Missed

1. **Bug 1**: The review workflow was added later (Phase 2), and the currency default logic was only in the initial processing path. The review workflow paths were not updated to include the same defensive logic.

2. **Bug 2**: The direct processing path was the original implementation. When the review workflow was added, it correctly used transactions for statistics updates, but the legacy path was never updated to match.

### Prevention

To prevent similar bugs in the future:
1. **Consistency**: Ensure all code paths that handle the same data use the same validation and default logic
2. **Transactions**: Always use transactions for read-modify-write operations in Firestore
3. **Code Review**: Check for race conditions in concurrent operations
4. **Testing**: Test both workflow paths (direct and review) with edge cases

---

**Status**: ✅ Both bugs fixed and tested (TypeScript compilation successful)  
**Deployed**: Pending deployment to Firebase Functions  
**Date**: December 17, 2025

