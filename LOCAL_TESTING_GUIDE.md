# Local Testing Guide

## 🚀 Quick Start

Your emulators are running at:
- **Frontend**: http://127.0.0.1:5000
- **Emulator UI**: http://127.0.0.1:4000

---

## 👤 Testing as Regular User

### 1. Sign Up
1. Go to http://127.0.0.1:5000
2. Click **"Sign Up"**
3. Enter email and password
4. Verify your email (check Firebase Auth emulator)

### 2. Upload Receipt
1. Click **"Upload Receipt"**
2. Select a receipt image (JPG/PNG)
3. Wait for processing

### 3. Review Receipt (if ENABLE_REVIEW_WORKFLOW=true)
1. Go to http://127.0.0.1:5000/review.html
2. Review extracted data
3. Correct any errors
4. Click **"Confirm"** to finalize

### 4. View Profile
1. Go to http://127.0.0.1:5000/profile.html
2. See your statistics
3. View processing history

---

## 👨‍💼 Testing as Admin

### 1. Set Admin Privileges

**Option A: Use Firebase Console** (Production)
```
1. Go to Firebase Console
2. Authentication → Users
3. Find your user
4. Set custom claim: admin = true
```

**Option B: Use Admin Function** (If you already have an admin)
```javascript
// Call setAdminClaim function from another admin account
firebase.functions().httpsCallable('setAdminClaim')({ 
    email: 'youruser@example.com' 
});
```

**Option C: Direct Database** (Local Testing)
```
1. Go to http://127.0.0.1:4000 (Emulator UI)
2. Authentication tab
3. Find your user
4. Click "Custom Claims"
5. Add: { "admin": true }
```

### 2. Access Admin Dashboard
1. Once admin privileges are set, refresh the page
2. You'll see **"Admin Dashboard"** link in navigation
3. Go to http://127.0.0.1:5000/admin.html

### 3. Admin Features to Test

#### View All Users
- See all registered users
- View user statistics
- See pending receipts count

#### Review Pending Receipts
1. Go to http://127.0.0.1:5000/admin-review.html
2. See receipts that need admin review
3. **Approve** or **Reject** receipts

#### Manage Categories
- Create new categories
- Edit existing categories
- Delete categories

#### Archive Old Data
- Set archive date
- Run dry-run to preview
- Archive old receipts

---

## 🧪 Testing Scenarios

### Scenario 1: Normal Receipt Flow
1. **User**: Upload receipt
2. **User**: Review and confirm
3. **User**: Check profile statistics
4. **Verify**: Google Sheet updated

### Scenario 2: Validation Failure Flow
1. **User**: Upload receipt with invalid VAT
2. **System**: Flags for admin review
3. **Admin**: Go to admin-review.html
4. **Admin**: Correct data and approve
5. **Verify**: Receipt finalized

### Scenario 3: Currency Conversion
1. **User**: Upload receipt in USD
2. **System**: Detects currency
3. **System**: Converts to GBP
4. **Verify**: Check logs for conversion
5. **Verify**: Google Sheet shows GBP

### Scenario 4: VAT Extraction
1. **User**: Upload UK receipt with VAT
2. **System**: Extracts supplier VAT number
3. **System**: Extracts VAT breakdown
4. **Verify**: Google Sheet has VAT columns populated

### Scenario 5: Concurrent Operations
1. Open two browser windows
2. **User 1**: Upload receipt
3. **User 2**: Upload receipt (simultaneously)
4. **Verify**: Both users' statistics correct

---

## 🔍 Where to Look

### Check Logs
```
Terminal running emulators will show:
- "Receipt currency detected: USD"
- "Converted 100 USD to 82 GBP"
- "Receipt validation failed"
- "Admin approved receipt"
```

### Check Emulator UI (http://127.0.0.1:4000)
- **Functions Tab**: See all function calls
- **Auth Tab**: See users and custom claims
- **Logs**: See detailed function logs

### Check Google Sheets
- Main sheet: All receipt data (16 columns)
- Accountant_CSV_Ready: Simplified format (9 columns)

---

## 🎯 Key Features to Test

### Phase 1 Features
- ✅ **Entity Tracking**: Receipts tagged with entity
- ✅ **Multi-Language**: Change language (if implemented in UI)
- ✅ **Archive Function**: Admin can archive old data

### Phase 2 Features
- ✅ **Review Workflow**: User reviews before finalization
- ✅ **Dynamic Categories**: Admin can manage categories
- ✅ **Currency Conversion**: Auto-converts to base currency
- ✅ **Validation**: VAT numbers validated
- ✅ **Admin Review**: Admin can approve/reject receipts

### Phase 3 Features
- ✅ **VAT Extraction**: Supplier VAT and breakdown extracted
- ✅ **Accountant Tab**: Separate CSV-ready sheet created
- ✅ **Audit Trail**: All actions logged with timestamps

---

## 🐛 Common Issues

### "Not authorized" Error
- **Solution**: Make sure admin custom claim is set
- **Check**: Emulator UI → Authentication → Custom Claims

### Receipt Not Processing
- **Check**: Terminal logs for errors
- **Check**: File is valid image (JPG/PNG)
- **Check**: File size under 10MB

### Google Sheets Not Updating
- **Check**: GOOGLE_SHEET_ID environment variable set
- **Check**: Service account has editor access
- **Note**: Using production sheets in emulator mode

### Currency Conversion Not Working
- **Check**: BASE_CURRENCY environment variable set
- **Check**: Frankfurter API accessible
- **Check**: Receipt has currency extracted by Gemini

---

## 📱 Page Links

### User Pages
- **Home**: http://127.0.0.1:5000
- **Profile**: http://127.0.0.1:5000/profile.html
- **Review**: http://127.0.0.1:5000/review.html

### Admin Pages
- **Admin Dashboard**: http://127.0.0.1:5000/admin.html
- **Admin Review**: http://127.0.0.1:5000/admin-review.html

### Dev Tools
- **Emulator UI**: http://127.0.0.1:4000
- **Functions Endpoint**: http://127.0.0.1:5001

---

## 🔄 Quick Admin Setup (Easiest Method)

### Using Emulator UI (Recommended for Local Testing)

1. **Sign up** as a regular user first at http://127.0.0.1:5000
2. Go to **Emulator UI**: http://127.0.0.1:4000
3. Click **"Authentication"** tab
4. Find your user in the list
5. Click the **3 dots** menu → **"Set custom user claims"**
6. Enter: `{ "admin": true }`
7. Click **"Save"**
8. **Refresh** your app page (http://127.0.0.1:5000)
9. You should now see **"Admin Dashboard"** in the navigation!

---

## ✅ Testing Checklist

### Basic Flow
- [ ] Sign up new user
- [ ] Upload receipt
- [ ] Review receipt (if review workflow enabled)
- [ ] Check profile statistics
- [ ] Verify Google Sheet updated

### Admin Flow
- [ ] Set admin custom claim
- [ ] Access admin dashboard
- [ ] View all users
- [ ] Manage categories
- [ ] Review pending receipts
- [ ] Approve/reject receipts

### Advanced Features
- [ ] Currency conversion works
- [ ] VAT extraction works
- [ ] Accountant tab created
- [ ] Audit trail populated
- [ ] Concurrent operations handled correctly

---

**Happy Testing!** 🎉

If you encounter any issues, check the terminal logs where emulators are running.

