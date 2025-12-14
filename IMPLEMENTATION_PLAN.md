# Implementation Plan: Admin Dashboard & Enhanced User Features

## 📋 Overview

This plan outlines the implementation of:
1. **Admin Dashboard** - For viewing all receipts, errors, and system stats
2. **Enhanced User Dashboard** - Personal analytics, receipt editing, and better UX

---

## 🎯 Phase 1: Admin Dashboard (Priority: High)

### Step 1.1: Admin Authentication System
**Goal**: Create admin role checking mechanism

**Tasks**:
- [ ] Create Firestore collection `admins` with admin email addresses
- [ ] Add helper function to check if user is admin
- [ ] Create admin middleware/guard for admin routes
- [ ] Add admin role to user document on first admin login

**Files to Create/Modify**:
- `public/admin.js` - Admin authentication logic
- Firestore: Create `admins/{email}` documents

**Estimated Time**: 1-2 hours

---

### Step 1.2: Admin Page Structure
**Goal**: Create admin.html with navigation and layout

**Tasks**:
- [ ] Create `public/admin.html` with:
  - Navigation sidebar/menu
  - Main content area
  - Admin header with logout
- [ ] Add admin link in main app (only visible to admins)
- [ ] Style admin page with admin-specific theme

**Files to Create**:
- `public/admin.html`
- `public/admin.js` (admin logic)
- Update `public/styles.css` (admin styles)

**Estimated Time**: 2-3 hours

---

### Step 1.3: All Receipts Viewer
**Goal**: Display all receipts from all users

**Tasks**:
- [ ] Query Firestore `batches` collection (all users)
- [ ] Display receipts in table/card format with:
  - User email/ID
  - Receipt data (vendor, date, amount, category)
  - Processing status
  - Timestamp
- [ ] Add filtering (by user, status, date range)
- [ ] Add pagination for large datasets

**Data Structure**:
```javascript
// Firestore: /batches/{userId}
{
  status: 'complete' | 'error' | 'processing',
  lastFileProcessed: 'filename.jpg',
  receiptData: { vendorName, transactionDate, totalAmount, category },
  timestamp: 'ISO string',
  errorMessage: '...' // if error
}
```

**Files to Modify**:
- `public/admin.js` - Add `loadAllReceipts()` function

**Estimated Time**: 3-4 hours

---

### Step 1.4: Error Log Viewer
**Goal**: Display all processing errors

**Tasks**:
- [ ] Query Firestore for all documents with `status: 'error'`
- [ ] Display error details:
  - User ID
  - File name
  - Error message
  - Timestamp
  - Option to retry (future feature)
- [ ] Add error filtering and search

**Files to Modify**:
- `public/admin.js` - Add `loadErrorLogs()` function

**Estimated Time**: 2-3 hours

---

### Step 1.5: Admin Statistics Dashboard
**Goal**: Show system-wide statistics

**Tasks**:
- [ ] Calculate and display:
  - Total receipts processed
  - Success rate (%)
  - Total amount processed
  - Number of active users
  - Receipts by category
  - Processing time averages
- [ ] Add charts (using Chart.js or similar)
- [ ] Add date range selector

**Files to Modify**:
- `public/admin.js` - Add `calculateStats()` function
- Add chart library (CDN or npm)

**Estimated Time**: 3-4 hours

---

## 🎯 Phase 2: Enhanced User Dashboard (Priority: Medium-High)

### Step 2.1: User Dashboard Page
**Goal**: Create dedicated dashboard page for users

**Tasks**:
- [ ] Create `public/dashboard.html`
- [ ] Add navigation between "Upload" and "Dashboard"
- [ ] Create dashboard layout with sections:
  - Summary cards (total spent, receipts count, etc.)
  - Category breakdown
  - Recent receipts
  - Monthly spending chart

**Files to Create**:
- `public/dashboard.html`
- `public/dashboard.js`

**Estimated Time**: 2-3 hours

---

### Step 2.2: Spending Analytics
**Goal**: Show personal spending insights

**Tasks**:
- [ ] Aggregate user's receipt data from Firestore
- [ ] Calculate:
  - Total spending
  - Spending by category
  - Monthly spending trends
  - Average receipt amount
- [ ] Display in charts and tables
- [ ] Add date range filtering

**Data Aggregation**:
- Query user's `/batches/{userId}` document
- Extract `receiptData` from all successful receipts
- Group by category and date

**Files to Create/Modify**:
- `public/dashboard.js` - Add analytics functions

**Estimated Time**: 4-5 hours

---

### Step 2.3: Receipt Editing
**Goal**: Allow users to edit/correct extracted data

**Tasks**:
- [ ] Add "Edit" button to each receipt in history
- [ ] Create edit modal/form
- [ ] Update Firestore document with corrected data
- [ ] Update Google Sheets (via Cloud Function or direct API)
- [ ] Show success/error feedback

**Implementation Options**:
1. **Direct Firestore Update** (simpler, but Sheets won't update)
2. **Cloud Function** (update both Firestore and Sheets)

**Recommended**: Option 2 - Create `updateReceipt` Cloud Function

**Files to Create/Modify**:
- `public/dashboard.js` - Edit UI
- `functions/src/index.ts` - Add `updateReceipt` function
- `functions/src/sheets.ts` - Add `updateReceiptInSheet` function

**Estimated Time**: 4-5 hours

---

### Step 2.4: Receipt Gallery
**Goal**: Better receipt viewing with search/filter

**Tasks**:
- [ ] Display receipts in grid/list view
- [ ] Add search (by vendor, date, amount)
- [ ] Add filters (by category, date range)
- [ ] Add sorting options
- [ ] Show receipt image thumbnail (if stored)
- [ ] Add "View Details" modal

**Files to Modify**:
- `public/dashboard.js` - Gallery functions
- `public/styles.css` - Gallery styles

**Estimated Time**: 3-4 hours

---

### Step 2.5: Charts & Visualizations
**Goal**: Visual representation of spending data

**Tasks**:
- [ ] Install chart library (Chart.js via CDN)
- [ ] Create charts:
  - Pie chart: Spending by category
  - Line chart: Monthly spending trend
  - Bar chart: Top vendors
- [ ] Make charts responsive
- [ ] Add export options (future)

**Files to Modify**:
- `public/dashboard.js` - Chart rendering
- Add Chart.js CDN to `dashboard.html`

**Estimated Time**: 2-3 hours

---

## 🔧 Technical Implementation Details

### Firestore Data Structure

```javascript
// Admin collection
/admins/{email}
{
  email: "admin@example.com",
  createdAt: timestamp
}

// User batches (existing)
/batches/{userId}
{
  status: "complete",
  lastFileProcessed: "receipt.jpg",
  receiptData: {
    vendorName: "Walmart",
    transactionDate: "2024-01-15",
    totalAmount: 45.99,
    category: "Supplies",
    timestamp: "2024-01-15T10:30:00Z"
  },
  timestamp: "2024-01-15T10:30:00Z"
}

// Enhanced: Store individual receipts (for editing)
/receipts/{userId}/{receiptId}
{
  fileName: "receipt.jpg",
  receiptData: { ... },
  status: "complete",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Cloud Functions to Add

```typescript
// functions/src/index.ts

// Update receipt data
export const updateReceipt = onCall(async (request) => {
  // Verify user owns receipt
  // Update Firestore
  // Update Google Sheets
  // Return success
});
```

### Security Rules Updates

```javascript
// Firestore Rules
match /admins/{email} {
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
}

match /receipts/{userId}/{receiptId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == userId;
}
```

---

## 📅 Timeline Estimate

### Week 1: Admin Dashboard
- Days 1-2: Admin auth + page structure
- Days 3-4: All receipts viewer + error logs
- Day 5: Statistics dashboard

### Week 2: User Dashboard
- Days 1-2: Dashboard page + basic analytics
- Days 3-4: Receipt editing
- Day 5: Gallery + charts

**Total Estimated Time**: ~35-45 hours

---

## 🚀 Quick Start (MVP)

**Minimum Viable Admin Dashboard**:
1. Admin authentication check
2. Simple admin page
3. List all receipts (basic table)
4. Show error count

**Minimum Viable User Dashboard**:
1. Dashboard page
2. Total spending + receipt count
3. Category breakdown (simple list)
4. Recent receipts list

**MVP Time**: ~15-20 hours

---

## 📝 Next Steps

1. **Review and approve plan**
2. **Start with MVP** (admin auth + basic views)
3. **Iterate and enhance** based on feedback
4. **Add advanced features** (charts, editing, etc.)

---

**Last Updated**: [Current Date]
**Status**: Planning Phase
