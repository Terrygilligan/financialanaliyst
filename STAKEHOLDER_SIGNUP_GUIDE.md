# Stakeholder Signup Guide

## Overview

This guide explains how new stakeholders, testers, and users can access and start using the AI Financial Analyst application.

---

## Quick Start for New Users

### Step 1: Access the Application

**Production URL:** `https://financialanaliyst.web.app` (or your deployed Firebase Hosting URL)

**Local Testing:** `http://localhost:5000` (if testing locally)

---

### Step 2: Sign Up for an Account

1. **Navigate to the app** in your web browser
2. Click the **"Sign In"** button (top right corner)
3. Choose your signup method:
   - **Email/Password**: Create an account with your email
   - **Google Sign-In**: Sign up with your Google account (fastest)

#### Email/Password Signup
1. Click **"Sign Up"** link
2. Enter your email address
3. Create a secure password
4. Click **"Create Account"**
5. Verify your email (if required)

#### Google Sign-In
1. Click **"Sign in with Google"**
2. Choose your Google account
3. Grant permissions
4. You're ready to go!

---

### Step 3: Start Using the App

Once signed in, you can immediately:

#### For Regular Users
- **Upload Receipts**: Click "Upload Receipt" and select an image
- **Review Receipts**: Check extracted data and make corrections
- **View Statistics**: See your receipt history and spending on the Profile page
- **Track Entities**: Receipts can be assigned to different business entities

#### Dashboard Features
- **Total Receipts**: Count of all processed receipts
- **Total Amount**: Sum of all expenses
- **Pending Receipts**: Receipts awaiting your review
- **Recent Activity**: Your latest uploads

---

## Getting Admin Access

If you need administrative privileges:

### Request Admin Access
1. Contact the system administrator
2. Provide your **exact email address** used for signup
3. Administrator will add you to the admin list

### Verify Admin Access
Once granted:
1. Sign out of the application
2. Sign back in
3. You should see an **"Admin"** link in the navigation
4. Click it to access the Admin Dashboard

---

## Troubleshooting

### Can't Sign Up?
- **Check your internet connection**
- **Use a different browser** (Chrome, Firefox, Safari, Edge)
- **Clear browser cache and cookies**
- **Disable browser extensions** temporarily

### Forgot Password?
1. Click **"Sign In"**
2. Click **"Forgot Password?"** link
3. Enter your email
4. Check email for password reset link

### Google Sign-In Not Working?
- **Ensure pop-ups are allowed** for the site
- **Check if third-party cookies are enabled**
- **Try a different Google account**

### Email Verification Issues?
- **Check spam/junk folder**
- **Wait a few minutes** (emails can be delayed)
- **Request a new verification email**
- **Contact administrator** if issues persist

---

## What Happens After Signup?

### Automatic Setup
When you sign up, the system automatically:
- Creates your user profile in Firestore
- Initializes your statistics (receipts: 0, amount: 0)
- Assigns you to the default entity ("Unassigned")
- Grants basic user permissions

### No Approval Required!
- **Immediate access** to all user features
- **No waiting** for admin approval
- **Start uploading receipts** right away

### Data Privacy
- Your data is **encrypted in transit** (HTTPS)
- Stored securely in **Firebase/Firestore**
- Only you and admins can see your receipts
- Google Sheets data is **private to authorized accounts**

---

## Features Available to Users

### Receipt Processing
✅ **AI-Powered Extraction**: Gemini AI extracts vendor, date, amount, category  
✅ **Multi-Currency Support**: Automatic conversion to base currency (GBP)  
✅ **VAT Extraction**: Captures VAT details if visible  
✅ **Category Assignment**: Automatically categorizes expenses  

### Review Workflow
✅ **Pending Receipts**: Review AI-extracted data before finalizing  
✅ **Edit & Correct**: Fix any extraction errors  
✅ **Validation**: System checks for errors (future dates, invalid amounts)  
✅ **Admin Review**: Flagged receipts go to admin for approval  

### User Dashboard
✅ **Statistics**: View total receipts, amounts, pending count  
✅ **Entity Tracking**: See which business entity receipts belong to  
✅ **Recent Activity**: Track your last uploaded receipts  
✅ **Profile Management**: Update account settings  

---

## Workflow for New Stakeholders

### 1. Initial Signup
```
Sign Up → Verify Email → Sign In → Dashboard
```

### 2. First Receipt Upload
```
Upload Image → AI Extraction → Review Data → Finalize → Google Sheets
```

### 3. Regular Usage
```
Upload → Review → Finalize (repeat)
```

### 4. Admin Testing (if granted access)
```
Sign In → Admin Link → Dashboard → Review Flagged Receipts
```

---

## Testing Scenarios

### For Stakeholders Testing the App

#### Test Case 1: Basic Receipt Upload
1. Sign up and sign in
2. Upload a sample receipt image
3. Wait for AI processing (~5-10 seconds)
4. Review extracted data
5. Click "Finalize Receipt"
6. Check Google Sheet for data

#### Test Case 2: Multi-Currency Receipt
1. Upload receipt in USD, EUR, or other currency
2. Verify currency is detected
3. Check if amount is converted to GBP
4. Finalize and verify Google Sheet shows both amounts

#### Test Case 3: Receipt with VAT
1. Upload UK receipt with VAT details
2. Verify VAT Number is extracted
3. Check VAT breakdown (subtotal, VAT amount, rate)
4. Finalize and verify Accountant CSV tab

#### Test Case 4: Error Handling
1. Upload receipt with future date
2. See validation error message
3. Verify receipt is flagged for admin review
4. Admin approves or corrects receipt

---

## FAQ

### Q: Do I need to be pre-registered?
**A:** No! Anyone can sign up directly on the app. No pre-registration or approval needed.

### Q: How do I upload receipts?
**A:** After signing in, click "Upload Receipt" button, select an image file (JPEG, PNG, GIF, WebP), and the AI will process it automatically.

### Q: What happens to my uploaded receipts?
**A:** Receipt images are stored in Firebase Storage. Extracted data goes to Firestore (for the app) and Google Sheets (for reporting).

### Q: Can I see other users' receipts?
**A:** No. Regular users only see their own receipts. Only admins can see all receipts across all users.

### Q: How long does AI processing take?
**A:** Typically 5-10 seconds. Complex receipts may take up to 15-20 seconds.

### Q: What file formats are supported?
**A:** JPEG, PNG, GIF, and WebP images.

### Q: Is there a file size limit?
**A:** Firebase Storage has default limits (5MB for free tier). Compress large images if needed.

### Q: Can I delete uploaded receipts?
**A:** Not currently. Contact an admin to delete receipts if needed.

### Q: How do I become an admin?
**A:** Contact the system administrator with your email address. They'll add you to the Firestore `admins` collection.

---

## Support & Contact

### For Help
- **Check documentation**: See README.md and USER_GUIDE.md
- **Browser console**: Open DevTools (F12) to check for errors
- **Firebase Console**: Admins can check Firebase logs

### Common Issues
- **"Access Denied"**: You're trying to access admin features without admin privileges
- **"Upload Failed"**: Check file size and format
- **"Processing Failed"**: The AI couldn't extract data (try a clearer image)
- **"Validation Error"**: The receipt has issues (future date, negative amount, etc.)

---

## Quick Reference

### User Actions
| Action | What It Does |
|--------|--------------|
| Upload Receipt | Sends image to AI for processing |
| Review Receipt | Check and edit extracted data |
| Finalize Receipt | Approves data and writes to Google Sheets |
| View Profile | See your statistics and settings |

### Admin Actions (if you have admin access)
| Action | What It Does |
|--------|--------------|
| View Dashboard | See system-wide statistics |
| Review Flagged Receipts | Approve or reject receipts with errors |
| Manage Users | View all users and their activity |
| Access Logs | Check system errors and warnings |

---

## Next Steps After Signing Up

1. ✅ **Upload a test receipt** to familiarize yourself with the workflow
2. ✅ **Review the extracted data** to see how AI performs
3. ✅ **Check the Google Sheet** to see how data is organized
4. ✅ **Explore the Profile page** to view your statistics
5. ✅ **Read the User Guide** for detailed instructions

---

**Welcome to AI Financial Analyst!** 🎉

We're excited to have you onboard. If you have any questions or feedback, please contact the system administrator.

---

**Last Updated**: December 17, 2025

