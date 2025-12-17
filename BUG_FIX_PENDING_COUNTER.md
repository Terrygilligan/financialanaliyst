# Bug Fix: Double-Decrement of pendingReceipts Counter

**Date**: December 17, 2025  
**Severity**: Medium  
**Status**: ✅ Fixed

---

## Problem

The `pendingReceipts` counter in user statistics was being decremented twice for receipts that failed validation and required admin review, resulting in incorrect user statistics.

### Root Cause

When a user finalized a receipt that failed validation:

1. Receipt was flagged for admin review
2. `pendingReceipts` counter was decremented (**finalize.ts:135**) ❌ **INCORRECT**
3. Receipt remained in `pending_receipts` collection (still pending!)
4. When admin later approved the receipt, counter was decremented **AGAIN** (**admin-review.ts:182**) ❌ **DOUBLE DECREMENT**

### Impact

- User statistics showed incorrect `pendingReceipts` counts
- Counter could go negative in some cases
- Dashboard displayed inaccurate pending receipt counts

---

## Solution

Removed the counter decrement from the validation failure path in `finalize.ts`.

### Logic

A receipt should only decrement the `pendingReceipts` counter when it **truly leaves** the pending state:

✅ **Correct paths (counter is decremented):**
- User finalizes receipt successfully → `finalize.ts:212`
- Admin approves receipt → `admin-review.ts:182`
- Admin rejects receipt → `admin-review.ts:311`

❌ **Incorrect path (counter should NOT be decremented):**
- User finalizes, validation fails → Receipt is flagged but **still pending**

### Code Change

**File**: `functions/src/finalize.ts`  
**Lines**: Removed 127-138

**Before:**
```typescript
// Update user statistics using transaction to prevent race conditions
// Decrement pendingReceipts to keep stats accurate
const userRef = db.collection('users').doc(callerUid);
await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const currentStats = userDoc.exists ? (userDoc.data() || { pendingReceipts: 0 }) : { pendingReceipts: 0 };
    
    transaction.set(userRef, {
        pendingReceipts: Math.max(0, (currentStats.pendingReceipts || 0) - 1),
        lastUpdated: new Date().toISOString()
    }, { merge: true });
});
```

**After:**
```typescript
// Bug Fix: Do NOT decrement pendingReceipts here
// The receipt is still pending (just flagged for admin review)
// The counter will be decremented when the admin approves/rejects it
```

---

## Testing

To verify the fix:

1. Upload a receipt that will fail validation (e.g., future date, invalid VAT)
2. Note the `pendingReceipts` count
3. Finalize the receipt → It should be flagged for admin review
4. Check `pendingReceipts` count → Should remain **unchanged**
5. Admin approves/rejects the receipt
6. Check `pendingReceipts` count → Should decrement by **1 only**

---

## Files Modified

- `functions/src/finalize.ts` - Removed incorrect counter decrement
- `README.md` - Updated bug fix list
- `TODO.md` - Updated bug fix list
- `BUG_FIX_PENDING_COUNTER.md` - This documentation (new)

---

## Related Documentation

- `BUG_FIXES_DEC17_2025.md` - Other bug fixes from same day
- `functions/src/admin-review.ts` - Admin approval/rejection logic
- `functions/src/finalize.ts` - User finalization logic

---

**Status**: ✅ Fixed, compiled, and tested

