# User Profile & Admin Dashboard Implementation Plan

## 📋 Overview

This document outlines the implementation of:
1. **User Profile Page** - Personal account management and statistics
2. **Admin Dashboard** - System management, user oversight, and analytics

---

## 🎯 Phase 1: User Profile Page

### Features
- **User Information Display**
  - Email address
  - Account creation date
  - Email verification status
  - Profile picture (if using Google Sign-In)

- **Account Statistics**
  - Total receipts uploaded
  - Total amount processed
  - Success rate
  - Recent activity

- **Account Management**
  - Change password (for email/password users)
  - Resend verification email
  - Account deletion (future)

- **Receipt History**
  - List of all uploaded receipts
  - Status of each receipt
  - Quick view of receipt data

### Files to Create
- `public/profile.html` - Profile page UI
- `public/profile.js` - Profile page logic

### Navigation
- Add "Profile" link in main app header (visible to all authenticated users)

---

## 🎯 Phase 2: Admin Dashboard

### Features
- **Admin Authentication**
  - Check if user is admin via Firestore `admins` collection
  - Redirect non-admins
  - Admin-only navigation

- **All Receipts Viewer**
  - Display all receipts from all users
  - Filter by user, status, date range
  - Search functionality
  - Export options (future)

- **Error Log Viewer**
  - Display all processing errors
  - Error details and timestamps
  - User information for each error

- **User Management**
  - List all users
  - User statistics
  - Account status

- **System Statistics**
  - Total receipts processed
  - Success rate
  - Total amount processed
  - Active users count
  - Receipts by category
  - Processing time metrics

### Files to Create
- `public/admin.html` - Admin dashboard UI
- `public/admin.js` - Admin dashboard logic

### Navigation
- Add "Admin" link in main app header (visible only to admins)

---

## 🔧 Technical Implementation

### Firestore Data Structure

#### Admin Collection
```
/admins/{email}
{
  email: "admin@example.com",
  createdAt: timestamp,
  role: "admin"
}
```

#### User Profile Data (optional enhancement)
```
/users/{userId}
{
  email: string,
  createdAt: timestamp,
  lastLogin: timestamp,
  totalReceipts: number,
  totalAmount: number
}
```

### Security Rules Updates

```javascript
// Firestore Rules
match /admins/{email} {
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
}

match /users/{userId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == userId;
}
```

### Admin Setup

To make a user an admin:
1. Go to Firebase Console → Firestore Database
2. Create collection `admins`
3. Add document with ID = admin email address
4. Document fields: `{ email: "admin@example.com", createdAt: timestamp }`

---

## 📁 File Structure

```
public/
├── index.html          # Main app (update with navigation)
├── profile.html        # User profile page (NEW)
├── admin.html          # Admin dashboard (NEW)
├── profile.js          # Profile logic (NEW)
├── admin.js            # Admin logic (NEW)
├── app.js              # Main app logic (update navigation)
└── styles.css          # Styles (add profile/admin styles)
```

---

## 🚀 Implementation Steps

1. ✅ Create user profile page
2. ✅ Create admin dashboard
3. ✅ Add navigation links
4. ✅ Update Firestore security rules
5. ✅ Test admin authentication
6. ✅ Test user profile features

---

## 📝 Notes

- Admin access is controlled via Firestore `admins` collection
- Users can only access their own profile data
- Admin dashboard requires admin role check on page load
- All pages respect authentication state
