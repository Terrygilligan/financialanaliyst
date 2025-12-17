# Admin Guide - AI Financial Analyst

**Last Updated**: 2024-12-19  
**Version**: 1.3 (Phase 3.1 Complete - VAT Extraction)

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Admin Dashboard Overview](#admin-dashboard-overview)
3. [User Management](#user-management)
4. [System Monitoring](#system-monitoring)
5. [Receipt Management](#receipt-management)
6. [Entity Management](#entity-management)
7. [Data Archiving](#data-archiving)
8. [System Configuration](#system-configuration)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Features](#advanced-features)

---

## Getting Started

### Admin Access

To become an admin, you need admin privileges set via Firebase Custom Claims. Contact the system administrator or use the Cloud Function to set admin status.

### First Login as Admin

1. Sign in with your account (email/password or Google)
2. You'll see an "Admin" link in the navigation menu
3. Click "Admin" to access the Admin Dashboard
4. If you don't see the Admin link, your account doesn't have admin privileges

### Setting Admin Status

**Method 1: Using Cloud Function** (Recommended)
```javascript
// Call the setAdminClaim Cloud Function
// Via Firebase Console or HTTP call
{
  "uid": "user-id-here"
}
```

**Method 2: Via Firebase Console**
- Go to Firebase Console → Authentication → Users
- Find the user and set custom claims: `{ "admin": true }`

---

## Admin Dashboard Overview

### Dashboard Sections

The Admin Dashboard has several key sections:

1. **System Statistics** - Overview of system health
2. **All Receipts** - View all receipts from all users
3. **Error Logs** - Monitor processing errors
4. **User Management** - Manage user accounts
5. **Analytics Charts** - Visual data representation

### Navigation

- **Home**: Return to main upload page
- **Profile**: Your personal profile
- **Admin**: Admin Dashboard (admin-only)
- **Logout**: Sign out of your account

---

## System Monitoring

### System Statistics

The dashboard displays real-time statistics:

- **Total Receipts**: All receipts processed system-wide
- **Successful**: Number of successful extractions
- **Failed**: Number of failed extractions
- **Active Users**: Number of users who have uploaded receipts
- **Total Amount**: Sum of all processed receipt amounts
- **Success Rate**: Percentage of successful vs failed receipts

### Analytics Charts

#### Category Distribution (Pie Chart)
- Shows breakdown of receipts by category
- Helps identify spending patterns
- Updates in real-time

#### Status Distribution (Doughnut Chart)
- Shows proportion of: Complete, Processing, Error
- Helps monitor system health
- Identifies potential issues

### Monitoring Best Practices

✅ **Daily Checks:**
- Review error logs for recurring issues
- Monitor success rate (should be >90%)
- Check for unusual activity

✅ **Weekly Reviews:**
- Review user activity
- Check system statistics trends
- Review error patterns

---

## User Management

### Viewing All Users

1. Go to Admin Dashboard
2. Click on "User Management" tab
3. You'll see a list of all registered users

### User Information Displayed

- **User ID**: Firebase Auth UID
- **Email**: User's email address
- **Receipt Count**: Number of receipts uploaded
- **Total Amount**: Sum of their receipts
- **Last Activity**: Last receipt upload timestamp

### User Actions

#### Search Users
- Use the search box to find specific users
- Search by User ID or email
- Results update as you type

#### View User Receipts
- Click on a user to see their receipt history
- View all receipts uploaded by that user
- See processing status for each receipt

#### Disable User Account
- **Coming Soon**: Feature to disable user accounts
- Currently requires Firebase Console access

### Setting User Entity Assignment

**Phase 1.1 Feature**: Users can be assigned to entities

1. **Via Firestore** (Manual):
   - Go to Firebase Console → Firestore
   - Navigate to `/users/{userId}`
   - Add field: `entity: "Entity Name"`
   - Or use `/entity_assignments/{userId}` collection

2. **Via Cloud Function** (Recommended):
   - Use `assignEntityToUser` function from `entities.ts`
   - Call via HTTP or Firebase Console

---

## Receipt Management

### Viewing All Receipts

1. Go to Admin Dashboard
2. Click "All Receipts" tab
3. View all receipts from all users

### Receipt Information

Each receipt shows:
- **User ID**: Who uploaded it
- **Vendor Name**: Store/business name
- **Date**: Transaction date
- **Amount**: Total amount
- **Category**: Assigned category
- **Entity**: User's entity assignment
- **Status**: Processing, Complete, or Error
- **Timestamp**: When processed
- **File Name**: Original upload filename

### Filtering Receipts

#### By Status
- Use the status dropdown filter
- Options: All, Complete, Processing, Error
- View only receipts with specific status

#### By Search
- Use the search box
- Search by:
  - Vendor name
  - User ID
  - File name
- Results update in real-time

### Receipt Actions

#### View Details
- Click on a receipt to see full details
- View extracted data
- See processing timestamp

#### Access Storage File
- For error receipts, click the storage link
- Opens Firebase Storage file directly
- Useful for debugging failed extractions

#### Refresh Data
- Click "Refresh" button to reload receipts
- Updates the list with latest data
- Useful after processing new receipts

---

## Error Logs

### Viewing Errors

1. Go to Admin Dashboard
2. Click "Error Logs" tab
3. View all processing errors

### Error Information

Each error shows:
- **User ID**: Who uploaded the receipt
- **File Name**: Receipt filename
- **Error Message**: What went wrong
- **Timestamp**: When the error occurred
- **Storage Link**: Direct link to the file (if available)

### Common Error Types

#### AI Extraction Errors
- **"Failed to extract data"**: Receipt image unclear or not a receipt
- **"Invalid format"**: Receipt format not recognized
- **"Timeout"**: Processing took too long

#### Storage Errors
- **"File not found"**: Receipt file missing
- **"Permission denied"**: Storage access issue

#### Sheets Errors
- **"Sheet not found"**: Google Sheet ID incorrect
- **"Permission denied"**: Service Account lacks access
- **"Invalid range"**: Sheet headers don't match

### Error Resolution

1. **Review Error Message**: Understand what went wrong
2. **Check Storage File**: Click storage link to view the receipt
3. **Verify Receipt Quality**: Ensure image is clear and readable
4. **Check System Status**: Verify Google Sheets and APIs are working
5. **Contact User**: If needed, contact user for better receipt image

---

## Entity Management

### What are Entities?

Entities are used to organize users and receipts in multi-entity businesses. Each user can be assigned to one entity, and receipts are tagged with the entity name.

### Creating Entities

**Via Firestore**:
1. Go to Firebase Console → Firestore
2. Create collection: `entities`
3. Add document with:
   ```json
   {
     "name": "Entity A",
     "description": "Description here",
     "createdAt": "2024-01-01T00:00:00Z"
   }
   ```

### Assigning Users to Entities

**Method 1: Via User Document**
1. Go to `/users/{userId}` in Firestore
2. Add field: `entity: "Entity Name"`

**Method 2: Via Entity Assignments**
1. Go to `/entity_assignments/{userId}` in Firestore
2. Add document:
   ```json
   {
     "entityId": "entity-document-id",
     "assignedAt": "2024-01-01T00:00:00Z"
   }
   ```

**Method 3: Via Cloud Function** (Recommended)
- Use `assignEntityToUser(userId, entityId)` function
- Call via HTTP or Firebase Console

### Viewing Entity Assignments

- Check `/users/{userId}` for `entity` field
- Check `/entity_assignments/{userId}` for detailed assignment
- Receipts show entity in the "Entity" column

### Default Entity

- If no entity is assigned, receipts show "Unassigned"
- This is the default for all users without entity assignment

---

## Data Archiving

### Archive Function Overview

**Phase 1.3 Feature**: Archive old data to reduce storage costs

The `archiveData` Cloud Function moves old receipt data from active collections to archive collections.

### Using Archive Function

#### Via Cloud Function Call

```javascript
// Call archiveData function
{
  "archiveBefore": "2024-01-01T00:00:00Z", // ISO date
  "dryRun": false // Set to true to preview without archiving
}
```

#### Parameters

- **archiveBefore** (required): ISO date string. Archive receipts older than this date
- **dryRun** (optional): If `true`, shows what would be archived without actually archiving

#### Example: Archive Receipts Older Than 1 Year

```javascript
{
  "archiveBefore": "2023-12-31T23:59:59Z",
  "dryRun": false
}
```

### Archive Process

1. **Dry Run First** (Recommended):
   - Set `dryRun: true`
   - Review what will be archived
   - Verify the date is correct

2. **Execute Archive**:
   - Set `dryRun: false`
   - Function moves data to archive collections
   - Data is removed from active collections

### Archive Collections

- **Active**: `/batches`, `/receipts`
- **Archive**: `/archive_batches`, `/archive_receipts`

### Archive Safety

✅ **Safe Operations:**
- Data is moved, not deleted
- Archive collections preserve all data
- Includes metadata: `archivedAt`, `archivedBy`
- Can be restored if needed

⚠️ **Important Notes:**
- Only admins can run archive function
- Archive is permanent (data moved, not copied)
- Review dry run results before executing
- Keep backups of important data

---

## System Configuration

### Environment Variables

Key configuration (set in Firebase Console or `.env`):

- **GOOGLE_SHEET_ID**: Target Google Sheet ID
- **GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY**: Service Account JSON key
- **BASE_CURRENCY**: Base currency for conversions (default: GBP)
- **ENABLE_REVIEW_WORKFLOW**: Feature flag for review workflow (default: false)

### Google Sheets Configuration

#### Sheet Headers (Row 1)
Must match exactly:
- Column A: `Vendor Name`
- Column B: `Date`
- Column C: `Total Amount`
- Column D: `Category`
- Column E: `Timestamp`
- Column F: `Entity` (Phase 1.1)

#### Service Account Access
- Service Account email: `financial-output@financialanaliyst.iam.gserviceaccount.com`
- Must have "Editor" access to the Sheet
- Verify sharing in Google Sheets

### Firestore Collections

#### User Data
- `/users/{userId}` - User statistics and entity assignment
- `/batches/{userId}` - Receipt processing status
- `/entity_assignments/{userId}` - Entity assignments

#### System Data
- `/entities` - Entity definitions
- `/categories` - Dynamic categories (future)
- `/error_logs` - System error logs (future)

#### Archive Data
- `/archive_batches` - Archived batch data
- `/archive_receipts` - Archived receipt data

---

## Troubleshooting

### Common Admin Issues

#### Can't Access Admin Dashboard
**Problem**: "Access Denied" message

**Solutions**:
- Verify admin custom claim is set: `{ "admin": true }`
- Sign out and sign back in (claims refresh on login)
- Check Firebase Console → Authentication → Users → Custom Claims
- Contact system administrator

#### Statistics Not Updating
**Problem**: Dashboard shows old data

**Solutions**:
- Click "Refresh" button
- Check if new receipts are being processed
- Verify Firestore rules allow admin read access
- Check browser console for errors

#### Users Can't Upload
**Problem**: Users report upload failures

**Solutions**:
- Check Firebase Storage rules
- Verify user authentication
- Check Cloud Function logs
- Verify environment variables are set

#### Google Sheets Not Updating
**Problem**: Receipts process but don't appear in Sheets

**Solutions**:
- Verify Service Account has Editor access
- Check GOOGLE_SHEET_ID is correct
- Verify Sheet headers match expected format
- Check Cloud Function logs for Sheets errors
- See [TROUBLESHOOT_SHEETS_NOT_UPDATING.md](TROUBLESHOOT_SHEETS_NOT_UPDATING.md)

### System Health Checks

#### Daily Checks
- [ ] Review error logs
- [ ] Check success rate (>90% is good)
- [ ] Monitor active users
- [ ] Verify Google Sheets updates

#### Weekly Checks
- [ ] Review user activity trends
- [ ] Check for recurring errors
- [ ] Review system statistics
- [ ] Verify entity assignments

#### Monthly Checks
- [ ] Archive old data (if needed)
- [ ] Review storage usage
- [ ] Check API usage and costs
- [ ] Update documentation

---

## Advanced Features

### Custom Claims Management

#### Setting Admin Claims
```javascript
// Via Cloud Function: setAdminClaim
{
  "uid": "user-id-here"
}
```

#### Removing Admin Claims
```javascript
// Via Cloud Function: removeAdminClaim
{
  "uid": "user-id-here"
}
```

### Entity Tracking

#### Getting All Entities
```javascript
// Via entities.ts: getAllEntities()
// Returns array of all entities
```

#### Assigning Entity to User
```javascript
// Via entities.ts: assignEntityToUser(userId, entityId)
// Updates both /users and /entity_assignments
```

### Archive Management

#### Running Archive
```javascript
// Via archiveData Cloud Function
{
  "archiveBefore": "2024-01-01T00:00:00Z",
  "dryRun": true // Test first!
}
```

#### Archive Best Practices
1. Always run dry run first
2. Archive data older than 1 year (or your retention policy)
3. Keep backups before archiving
4. Monitor archive process for errors
5. Document archive dates for compliance

---

## Security Best Practices

### Admin Account Security

✅ **Do:**
- Use strong, unique passwords
- Enable 2FA if available
- Regularly review admin access
- Monitor for suspicious activity
- Keep admin accounts to minimum necessary

❌ **Don't:**
- Share admin credentials
- Leave admin sessions open
- Grant admin access unnecessarily
- Ignore security warnings

### Data Privacy

- Users can only see their own data
- Admins can see all data (use responsibly)
- All data is encrypted in transit and at rest
- Regular security audits recommended

---

## Feature Updates

### Phase 1 Features (Current)

✅ **Entity Tracking** - Multi-entity support  
✅ **Multi-Language UI** - Translation system  
✅ **Archive Function** - Data archiving automation  
✅ **Enhanced Admin Dashboard** - Better monitoring and management

### Coming Soon (Phase 2+)

📝 **Review Workflow** - Users review data before saving  
📝 **Dynamic Categories** - Manage categories via Firestore  
📝 **Currency Conversion** - Multi-currency support  
📝 **VAT Compliance** - Enhanced VAT extraction  
📝 **Accountant Tab** - Separate CSV-ready sheet  
📝 **Audit Trail** - Complete change history

---

## Quick Reference

### Admin Cloud Functions

- `setAdminClaim` - Grant admin privileges
- `removeAdminClaim` - Remove admin privileges
- `archiveData` - Archive old receipt data

### Firestore Collections

- `/users` - User data and statistics
- `/batches` - Receipt processing status
- `/entities` - Entity definitions
- `/entity_assignments` - User-entity mappings
- `/archive_batches` - Archived batch data
- `/archive_receipts` - Archived receipt data

### Key URLs

- **Firebase Console**: https://console.firebase.google.com
- **Google Sheets**: Your configured Sheet URL
- **Application**: Your deployed app URL

---

## Support

### Documentation

- **[USER_GUIDE.md](USER_GUIDE.md)** - User-facing guide
- **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Complete documentation index
- **[BRANCH_WORKFLOW.md](BRANCH_WORKFLOW.md)** - Development workflow
- **[CUSTOM_CLAIMS_SETUP.md](CUSTOM_CLAIMS_SETUP.md)** - Admin setup guide

### Getting Help

- Review error logs in Admin Dashboard
- Check Cloud Function logs in Firebase Console
- Review Firestore data directly
- Consult technical documentation

---

**Last Updated**: 2024-12-19  
**Version**: 1.0  
**Maintained By**: Development Team

