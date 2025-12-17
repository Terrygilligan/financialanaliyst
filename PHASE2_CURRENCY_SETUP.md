# Phase 2.4: Currency Conversion Setup Guide

## ✅ Implementation Complete

Multi-currency support with automatic conversion to base currency has been implemented.

---

## 🎯 Features

### 1. **Automatic Currency Detection**
- Gemini AI extracts currency code from receipts (e.g., USD, EUR, GBP)
- Defaults to GBP if currency is not visible on receipt

### 2. **Exchange Rate Caching**
- Rates cached in Firestore `/fx_cache` collection
- 24-hour cache expiry to reduce API calls
- Automatic cache cleanup when expired

### 3. **Free Exchange Rate API**
- Uses **Frankfurter API** (https://www.frankfurter.app/)
- No API key required
- Supports 30+ currencies
- Daily updated rates from European Central Bank

### 4. **Graceful Fallback**
- If conversion fails, original amount is used
- Warning logged but processing continues
- No data loss on conversion errors

### 5. **Backward Compatible**
- All currency fields are optional
- Existing receipts unaffected
- Works with or without currency detection

---

## 📊 Data Structure

### ReceiptData Interface (Updated)

```typescript
interface ReceiptData {
    vendorName: string;
    transactionDate: string;
    totalAmount: number;              // Converted amount (or original if no conversion)
    category: Category;
    timestamp: string;
    entity?: string;
    
    // NEW: Currency conversion fields (all optional)
    originalCurrency?: string;        // e.g., "USD", "EUR"
    originalAmount?: number;          // Amount before conversion
    exchangeRate?: number;            // Rate used (e.g., 1.27)
    conversionDate?: string;          // When conversion was done
}
```

### Firestore `/fx_cache` Collection

```typescript
{
    fromCurrency: "USD",
    toCurrency: "GBP",
    rate: 0.79,
    cachedAt: "2024-12-17T10:00:00Z",
    expiresAt: "2024-12-18T10:00:00Z"
}
```

---

## 🔧 Configuration

### Environment Variable

Add to Firebase Functions configuration:

```bash
BASE_CURRENCY=GBP
```

**Options**: Any ISO 4217 currency code (USD, EUR, GBP, etc.)  
**Default**: GBP if not set

### Set in Firebase Console

```bash
firebase functions:config:set base_currency="GBP"
```

Or in `.env` for local development:

```env
BASE_CURRENCY=GBP
```

---

## 📈 Google Sheets Updates

### New Columns Added

The sheet now has **9 columns** (updated from 6):

| Column | Header | Description |
|--------|--------|-------------|
| A | Vendor Name | Store/business name |
| B | Date | Transaction date (YYYY-MM-DD) |
| C | Total Amount | **Converted amount** in base currency |
| D | Category | Business category |
| E | Timestamp | Processing timestamp |
| F | Entity | User's entity assignment |
| **G** | **Original Currency** | Currency code (if converted) |
| **H** | **Original Amount** | Amount before conversion |
| **I** | **Exchange Rate** | Conversion rate used |

### Update Your Sheet Headers

**Important**: Add these three new headers to your Google Sheet:

1. Open your Google Sheet
2. Add to row 1:
   - Column G: `Original Currency`
   - Column H: `Original Amount`
   - Column I: `Exchange Rate`

### Example

```
| Vendor Name | Date       | Total Amount | Category    | Timestamp           | Entity     | Original Currency | Original Amount | Exchange Rate |
|-------------|------------|--------------|-------------|---------------------|------------|-------------------|-----------------|---------------|
| Amazon US   | 2024-12-17 | 78.74        | Supplies    | 2024-12-17T10:00:00 | Unassigned | USD               | 100.00          | 0.7874        |
| Local Store | 2024-12-17 | 50.00        | Maintenance | 2024-12-17T11:00:00 | Unassigned |                   |                 |               |
```

---

## 🔄 Workflow

### Receipt Processing Flow

```
1. Upload receipt image
   ↓
2. Gemini extracts data (including currency)
   ↓
3. Check if currency matches BASE_CURRENCY
   ↓
4a. Same currency → No conversion needed
   ↓
4b. Different currency → Convert
   ├─ Check cache (/fx_cache)
   ├─ If cached and valid → Use cached rate
   ├─ If not cached → Fetch from Frankfurter API
   ├─ Cache new rate (24h expiry)
   └─ Calculate converted amount
   ↓
5. Store both original and converted amounts
   ↓
6. Write to Google Sheets
   ↓
7. Update Firestore
```

---

## 🧪 Testing

### Test Scenarios

1. **Same Currency (No Conversion)**
   - Upload receipt in GBP
   - Verify: No conversion, currency fields empty

2. **Different Currency (With Conversion)**
   - Upload receipt in USD
   - Verify: Converted to GBP, original values stored

3. **Cache Hit**
   - Upload two USD receipts within 24 hours
   - Verify: Second uses cached rate (check logs)

4. **Cache Miss**
   - Wait 24+ hours or clear cache
   - Verify: Fresh rate fetched from API

5. **Conversion Failure**
   - Simulate API failure (disconnect network)
   - Verify: Original amount used, warning logged

### Manual Testing

```bash
# Check Firestore cache
firebase firestore:get fx_cache/USD_GBP

# View function logs
firebase functions:log --only analyzeReceiptUpload

# Test with different currencies
# Upload receipts with USD, EUR, JPY amounts
```

---

## 📋 Supported Currencies

Frankfurter API supports 30+ currencies including:

- **Major**: USD, EUR, GBP, JPY, CHF, CAD, AUD
- **European**: SEK, NOK, DKK, PLN, CZK, HUF
- **Asian**: CNY, HKD, SGD, KRW, INR, THB
- **Others**: NZD, ZAR, BRL, MXN, TRY

Full list: https://www.frankfurter.app/docs/

---

## 🐛 Troubleshooting

### Issue: Currency not detected

**Solution**: Gemini defaults to GBP if currency symbol not visible. Ensure receipt has clear currency indicator (£, $, €, etc.)

### Issue: Conversion fails

**Check**:
1. Frankfurter API status: https://www.frankfurter.app/
2. Function logs for error details
3. Network connectivity from Cloud Functions

**Fallback**: Original amount is used, processing continues

### Issue: Wrong exchange rate

**Note**: Rates are cached for 24 hours. For latest rates:
1. Delete cache document from `/fx_cache`
2. Or wait for automatic expiry

### Issue: Sheet validation fails

**Solution**: Ensure headers match exactly:
- Column G: `Original Currency`
- Column H: `Original Amount`
- Column I: `Exchange Rate`

---

## 📊 Monitoring

### Key Metrics to Track

1. **Conversion Success Rate**
   - Check logs for "Converted X to Y" messages
   - Monitor warnings for failed conversions

2. **Cache Hit Rate**
   - Check logs for "Using cached exchange rate"
   - High hit rate = good performance

3. **API Usage**
   - Monitor Frankfurter API calls
   - Should be low due to caching

### Firestore Queries

```javascript
// Get all cached rates
db.collection('fx_cache').get()

// Get specific rate
db.collection('fx_cache').doc('USD_GBP').get()

// Clean up expired cache (manual)
const now = new Date();
db.collection('fx_cache')
  .where('expiresAt', '<', now.toISOString())
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => doc.ref.delete());
  });
```

---

## 🔐 Security & Privacy

- **No API Keys Required**: Frankfurter is free and open
- **No Financial Data Sent**: Only currency codes sent to API
- **Rate Caching**: Reduces external API calls
- **Firestore Security**: Cache protected by existing rules

---

## 🚀 Next Steps

1. ✅ **Phase 2.4 Complete**: Currency conversion implemented
2. ⏭️ **Phase 2.5**: Validation System (VAT ID, category validation)
3. ⏭️ **Phase 2.6**: Admin Review Interface

---

## 📚 Related Documentation

- **[BRANCH_WORKFLOW.md](BRANCH_WORKFLOW.md)** - Complete development plan
- **[ENV_SETUP.md](ENV_SETUP.md)** - Environment variables guide
- **[USER_GUIDE.md](USER_GUIDE.md)** - User documentation
- **[ADMIN_GUIDE.md](ADMIN_GUIDE.md)** - Admin documentation

---

**Last Updated**: 2024-12-17  
**Status**: ✅ Production Ready (behind feature flag)

