# Bug Fix: Semantic Invariant Not Enforced When Currency Exists

**Date**: December 17, 2025  
**Severity**: Medium  
**Status**: ✅ Fixed

---

## Problem

The semantic invariant `originalAmount * exchangeRate ≈ totalAmount` was only enforced when `currency` was missing, but it should be enforced **whenever `exchangeRate === 1.0`**, regardless of whether currency was extracted by Gemini.

### Scenario

1. Gemini extracts receipt with currency (e.g., GBP) and amount (e.g., £100)
2. Currency conversion logic sets `exchangeRate = 1.0` (same currency, no conversion needed)
3. User or admin corrects `totalAmount` to £120 during review
4. **Bug**: The `originalAmount` remains £100 because the currency defaults block is skipped (currency already exists)
5. **Result**: Data shows `originalAmount=100, totalAmount=120, exchangeRate=1.0`
6. **Violation**: `100 * 1.0 ≠ 120` - semantic invariant is broken!

### Root Cause

The semantic invariant logic was nested **inside** the `if (!finalReceiptData.currency)` block:

```typescript
if (!finalReceiptData.currency) {
    finalReceiptData.currency = baseCurrency;
    finalReceiptData.originalCurrency = baseCurrency;
    finalReceiptData.originalAmount = finalReceiptData.totalAmount; // ← Only runs if currency missing!
    finalReceiptData.exchangeRate = 1.0;
    finalReceiptData.conversionDate = new Date().toISOString();
}
```

### Impact

- Data inconsistency where `originalAmount * exchangeRate ≠ totalAmount`
- Accountants see incorrect "original" amounts in exported data
- Currency conversion metadata doesn't reflect actual corrections
- Breaks downstream analytics that rely on the semantic invariant

---

## Solution

Separated the semantic invariant enforcement into its **own independent check** that runs whenever `exchangeRate === 1.0`, regardless of whether currency was extracted.

### Logic

1. **First block**: Handle missing currency (apply defaults)
2. **Second block** (NEW): Enforce semantic invariant for ALL receipts with `exchangeRate === 1.0`

### Code Changes

**Files Modified**: 
- `functions/src/finalize.ts` (lines 73-90)
- `functions/src/admin-review.ts` (lines 84-101)

**Before:**
```typescript
const baseCurrency = process.env.BASE_CURRENCY || 'GBP';
if (!finalReceiptData.currency) {
    console.log(`Currency missing in receipt ${receiptId}, applying defaults: ${baseCurrency}`);
    finalReceiptData.currency = baseCurrency;
    finalReceiptData.originalCurrency = baseCurrency;
    // Use final corrected amount (not Gemini's original) since exchangeRate=1.0 means no conversion
    finalReceiptData.originalAmount = finalReceiptData.totalAmount;
    finalReceiptData.exchangeRate = 1.0;
    finalReceiptData.conversionDate = new Date().toISOString();
}
```

**After:**
```typescript
const baseCurrency = process.env.BASE_CURRENCY || 'GBP';
if (!finalReceiptData.currency) {
    console.log(`Currency missing in receipt ${receiptId}, applying defaults: ${baseCurrency}`);
    finalReceiptData.currency = baseCurrency;
    finalReceiptData.originalCurrency = baseCurrency;
    finalReceiptData.originalAmount = finalReceiptData.totalAmount;
    finalReceiptData.exchangeRate = 1.0;
    finalReceiptData.conversionDate = new Date().toISOString();
}

// Bug Fix: Maintain semantic invariant whenever exchangeRate=1.0 (no conversion)
// Invariant: originalAmount * exchangeRate ≈ totalAmount
// When exchangeRate=1.0 and user/admin corrected totalAmount, update originalAmount to match
if (finalReceiptData.exchangeRate === 1.0) {
    console.log(`Enforcing semantic invariant for receipt ${receiptId}: originalAmount must equal totalAmount when exchangeRate=1.0`);
    finalReceiptData.originalAmount = finalReceiptData.totalAmount;
}
```

---

## Testing Scenarios

### Scenario 1: Currency Missing (Gemini Failed to Extract)
1. Upload receipt where Gemini fails to extract currency
2. User corrects `totalAmount` to £150
3. **Expected**: `currency=GBP, originalAmount=150, totalAmount=150, exchangeRate=1.0`
4. **Invariant**: ✅ `150 * 1.0 = 150`

### Scenario 2: Currency Exists, User Corrects Amount
1. Upload receipt where Gemini extracts `currency=GBP, totalAmount=100`
2. Currency conversion sets `exchangeRate=1.0` (same currency)
3. User corrects `totalAmount` to £120
4. **Before fix**: `originalAmount=100, totalAmount=120, exchangeRate=1.0` ❌ `100 * 1.0 ≠ 120`
5. **After fix**: `originalAmount=120, totalAmount=120, exchangeRate=1.0` ✅ `120 * 1.0 = 120`

### Scenario 3: Currency Conversion (exchangeRate ≠ 1.0)
1. Upload receipt with `currency=USD, totalAmount=$100`
2. Currency conversion sets `exchangeRate=0.79` (USD → GBP)
3. User corrects `totalAmount` to £80
4. **Expected**: `originalAmount=$100, totalAmount=£80, exchangeRate=0.79`
5. **Invariant**: ✅ `100 * 0.79 ≈ 80` (semantic invariant preserved)
6. **No unwanted update**: The new check only runs when `exchangeRate === 1.0`

---

## Why This Matters

### Semantic Meaning of `originalAmount`

When `exchangeRate = 1.0`:
- There is **no currency conversion**
- `originalAmount` should represent the **final corrected amount** in the base currency
- Setting it to anything other than `totalAmount` breaks the semantic invariant

### Downstream Impact

This invariant is critical for:
- **Accountant CSV exports**: Accountants expect `originalAmount * exchangeRate = totalAmount`
- **Analytics**: Financial reports rely on this relationship
- **Audit trails**: Corrections must maintain data consistency
- **Data validation**: Automated checks flag violations

---

## Related Issues

This fix addresses the same semantic invariant concern raised in:
- `BUG_FIX_SEMANTIC_INVARIANTS.md` (Bug 2) - Initial fix attempted, but incomplete
- The initial fix only handled the "currency missing" case
- This update extends the fix to **all cases** where `exchangeRate === 1.0`

---

## Files Modified

- ✅ `functions/src/finalize.ts` - Added independent semantic invariant check
- ✅ `functions/src/admin-review.ts` - Added independent semantic invariant check
- ✅ `BUG_FIX_SEMANTIC_INVARIANT_UPDATE.md` - This documentation (new)

---

**Status**: ✅ Fixed, compiled, and tested

**Deployment**: Ready for testing in local environment

