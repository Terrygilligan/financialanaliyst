# Admin Guide - AI Financial Analyst

**Last Updated**: December 31, 2025
**Version**: 2.0 (Multi-Tenant SaaS Silos)

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Admin Dashboard Overview](#admin-dashboard-overview)
3. [User Management](#user-management)
4. [System Monitoring](#system-monitoring)
5. [Silo Management](#silo-management)
6. [Data Archiving](#data-archiving)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Admin Access

To become an admin, you need admin privileges set via Firebase Custom Claims. Business owners are automatically granted "bookkeeper" roles for their silos.

### Setting Admin Status

**Method: Using Cloud Function**
```javascript
// Call the setAdminClaim Cloud Function
{
  "uid": "user-id-here"
}
```

---

## Admin Dashboard Overview

### Dashboard Sections

The Admin Dashboard provides visibility into your business silo:

1. **System Statistics**: Real-time overview of receipts and spending.
2. **Analytics**: Visual breakdown of expenses by category.
3. **Receipt Viewer**: Search and filter all receipts in your silo.
4. **Error Logs**: Monitor processing issues.
5. **Field Builder**: Define custom data for AI to extract.

---

## User Management

### Managing Drivers

Admins can invite new users (Drivers) to their business silo:
1. Click **"+ Create Driver"** in the User Management section.
2. Enter email, display name, and initial password.
3. The new user is automatically scoped to your `businessId`.

---

## Silo Management

### Data Isolation (The Silo Rule)

All data is strictly isolated. As a business admin, you can only see data belonging to your `businessId`. This includes:
- `/businesses/{businessId}/receipts/`
- `/businesses/{businessId}/activity/`
- `/businesses/{businessId}/users/`

### Field Builder

Customize what Gemini AI looks for on receipts:
1. Navigate to **Field Builder**.
2. Add fields like "Internal Project Code" or "Vehicle ID".
3. AI will automatically attempt to extract these from all future uploads.

---

## Data Archiving

Old data can be moved to archive collections to keep your active silo clean:
- Use the `archiveData` function with an `archiveBefore` date.
- Data is moved to `archive_receipts` subcollection within your silo.

---

## Troubleshooting

### Receipt Processing Stuck
- Check the **Error Logs** tab for specific failure reasons.
- Ensure the image is clear and of a supported type (JPG, PNG).
- Verify the user has the correct business association.

### Missing Data
- Ensure the **Review Workflow** is not waiting for user approval.
- Check the **Activity Log** for the last action taken on a receipt.

---

**Last Updated**: December 31, 2025  
**Maintained By**: Development Team
