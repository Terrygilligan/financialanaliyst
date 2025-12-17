# Phase 3.3: Audit Trail & Error Logging

## 📋 Overview

Phase 3.3 adds comprehensive audit logging and error tracking to the receipt processing system. This provides complete visibility into system operations, user actions, admin interventions, and errors for compliance and debugging.

---

## 🆕 What's New

### 1. Error Logging System (`functions/src/error-logging.ts`)

A centralized error logging system with:
- **Severity Levels**: INFO, WARNING, ERROR, CRITICAL
- **Firestore Storage**: All logs stored in `/error_logs` collection
- **Structured Logging**: Consistent format with context
- **Query Functions**: Filter and retrieve logs
- **Console Integration**: Logs also appear in Cloud Functions logs

### 2. Audit Trail Fields

Three new fields added to `ReceiptData`:
- **`processedBy`**: Who processed the receipt ('user', 'admin', 'system')
- **`validationStatus`**: Validation result ('passed', 'warning', 'failed', 'admin_override')
- **`hasErrors`**: Boolean flag for receipts with processing errors

### 3. Google Sheets Audit Columns

Three new columns added to main sheet:
- **Column N**: Processed By
- **Column O**: Validation Status
- **Column P**: Has Errors (YES/NO)

---

## 🔧 Technical Implementation

### Error Logging Functions

```typescript
// Log info (audit trail)
await logInfo('functionName', 'message', { context });

// Log warning
await logWarning('functionName', 'message', { context });

// Log error with full details
await logErrorWithDetails('functionName', error, { context });

// Log critical error
await logCritical('functionName', error, { context });
```

### Error Log Structure

```typescript
interface ErrorLogEntry {
    timestamp: string;
    severity: ErrorSeverity;
    functionName: string;
    errorMessage: string;
    errorStack?: string;
    userId?: string;
    receiptId?: string;
    fileName?: string;
    context?: Record<string, any>;
    serverTimestamp: string; // Added automatically
}
```

### Integration Points

**`finalizeReceipt`**:
- Logs validation failures
- Logs validation warnings
- Logs successful finalizations
- Logs errors with full context
- Sets audit trail fields

**`adminApproveReceipt`**:
- Logs admin overrides
- Logs admin approvals
- Logs errors
- Sets audit trail fields with admin status

**`adminRejectReceipt`**:
- Logs admin rejections
- Logs errors
- Includes rejection reason in context

---

## 📊 Firestore Collection: `/error_logs`

### Document Structure

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "serverTimestamp": "2024-01-15T10:30:01Z",
  "severity": "warning",
  "functionName": "finalizeReceipt",
  "errorMessage": "Receipt validation failed for receipt_123",
  "userId": "user_abc",
  "receiptId": "receipt_123",
  "fileName": "receipt.jpg",
  "context": {
    "errors": ["Invalid VAT number format"],
    "warnings": ["Amount seems unusually high"]
  }
}
```

### Querying Logs

```typescript
// Get all critical errors
const criticalErrors = await queryErrorLogs({
    severity: ErrorSeverity.CRITICAL,
    limit: 100
});

// Get errors for specific user
const userErrors = await queryErrorLogs({
    userId: 'user_abc',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31')
});

// Get errors from specific function
const functionErrors = await queryErrorLogs({
    functionName: 'finalizeReceipt',
    severity: ErrorSeverity.ERROR
});
```

---

## 📈 Audit Trail Use Cases

### 1. Compliance & Auditing
- **Who processed what**: Track which receipts were processed by users vs admins
- **Admin interventions**: See when admins override validation
- **Validation history**: Complete record of validation results
- **Error tracking**: All errors logged with full context

### 2. Debugging & Monitoring
- **Error patterns**: Identify recurring issues
- **User issues**: Track problems for specific users
- **Function performance**: Monitor which functions have errors
- **Critical alerts**: Immediate visibility into critical failures

### 3. Quality Assurance
- **Validation metrics**: How many receipts pass/fail/warn
- **Admin override rate**: Track how often admins override validation
- **Error rate**: Monitor system health
- **Processing patterns**: User vs admin vs system processing

---

## 🎯 Benefits

### For Administrators
- **Complete Visibility**: See all system operations
- **Error Tracking**: Identify and fix issues quickly
- **Audit Trail**: Full history for compliance
- **Admin Actions**: Track all admin interventions

### For Developers
- **Debugging**: Detailed error logs with context
- **Monitoring**: Track system health
- **Performance**: Identify bottlenecks
- **Testing**: Verify error handling

### For Compliance
- **Audit Trail**: Complete record of all operations
- **Admin Accountability**: Track who did what
- **Error Documentation**: All failures logged
- **Validation History**: Complete validation records

---

## 📊 Google Sheet Updates

### New Columns (N-P)

| Column | Field | Values | Purpose |
|--------|-------|--------|---------|
| **N** | Processed By | user, admin, system | Who finalized the receipt |
| **O** | Validation Status | passed, warning, failed, admin_override | Validation result |
| **P** | Has Errors | YES, NO | Quick error flag |

### Complete Header Row (A-P)

```
Vendor Name | Date | Total Amount | Category | Timestamp | Entity | Original Currency | Original Amount | Exchange Rate | Supplier VAT Number | VAT Subtotal | VAT Amount | VAT Rate | Processed By | Validation Status | Has Errors
```

### Example Data

```
Office Supplies Ltd | 2024-01-15 | 120.00 | Supplies | 2024-01-15T10:30:00Z | Entity A | USD | 100.00 | 1.2 | GB123456789 | 100.00 | 20.00 | 20 | user | passed | NO
```

With admin override:
```
Problem Vendor | 2024-01-16 | 50.00 | Other | 2024-01-16T14:00:00Z | Entity B | GBP | | | INVALID123 | | | | admin | admin_override | NO
```

---

## 🧪 Testing

### Test 1: Normal Processing
1. Upload and finalize a receipt
2. **Expected**: 
   - Processed By = "user"
   - Validation Status = "passed"
   - Has Errors = "NO"
   - Info log created in `/error_logs`

### Test 2: Validation Warning
1. Upload receipt with minor issues
2. Finalize it
3. **Expected**:
   - Processed By = "user"
   - Validation Status = "warning"
   - Has Errors = "NO"
   - Warning log created

### Test 3: Admin Override
1. Upload receipt with validation errors
2. Admin approves it
3. **Expected**:
   - Processed By = "admin"
   - Validation Status = "admin_override"
   - Has Errors = "NO"
   - Warning log for admin override

### Test 4: Error Handling
1. Cause a processing error (e.g., invalid sheet ID)
2. **Expected**:
   - Error log created with full stack trace
   - Context includes receipt ID, user ID
   - Severity = ERROR

---

## 🔍 Monitoring & Alerts

### Key Metrics to Monitor

1. **Error Rate**: Count of ERROR/CRITICAL logs per hour
2. **Admin Override Rate**: Percentage of receipts with admin_override status
3. **Validation Failure Rate**: Percentage of receipts failing validation
4. **Processing Time**: Time from upload to finalization

### Recommended Alerts

- **Critical Errors**: Immediate alert for any CRITICAL severity logs
- **High Error Rate**: Alert if error rate exceeds threshold
- **Admin Override Spike**: Alert if admin overrides increase suddenly
- **Validation Failures**: Alert if validation failure rate is high

---

## 🔄 Backward Compatibility

- **Existing Receipts**: Will have empty audit columns (backward compatible)
- **New Receipts**: Will populate all audit fields
- **No Breaking Changes**: Completely additive feature
- **Optional Fields**: All audit fields are optional in schema

---

## 🚀 Deployment

### Prerequisites

- Phase 3.1 (VAT Extraction) deployed
- Phase 3.2 (Accountant Tab) deployed
- Google Sheets updated with new columns (N-P)

### Deploy

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Verify

1. Check Firestore for `/error_logs` collection
2. Process a test receipt
3. Verify audit columns populated in Google Sheets
4. Query error logs to confirm logging works

---

## 🔮 Future Enhancements

- **Dashboard**: Admin UI for viewing logs
- **Alerts**: Email/SMS alerts for critical errors
- **Analytics**: Visualizations of error patterns
- **Retention**: Automatic log cleanup after X days
- **Export**: CSV export of error logs
- **Real-time Monitoring**: Live error dashboard

---

## 📚 Related Documentation

- **Error Logging**: `functions/src/error-logging.ts` - Complete implementation
- **Schema**: `functions/src/schema.ts` - Audit trail fields
- **Sheets**: `functions/src/sheets.ts` - Audit column integration
- **Admin Guide**: `ADMIN_GUIDE.md` - For administrators

---

**Phase 3.3 Status**: ✅ **COMPLETE**

**Last Updated**: December 2024

