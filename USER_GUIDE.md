# User Guide - AI Financial Analyst

**Last Updated**: 2024-12-19  
**Version**: 1.0 (Phase 1 Complete)

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Account Setup](#account-setup)
3. [Uploading Receipts](#uploading-receipts)
4. [Viewing Your Data](#viewing-your-data)
5. [Profile Management](#profile-management)
6. [Troubleshooting](#troubleshooting)
7. [FAQs](#faqs)

---

## Getting Started

### What is AI Financial Analyst?

AI Financial Analyst is a web application that automatically extracts financial data from receipt images using artificial intelligence. Simply upload a photo of your receipt, and the app will:

- Extract vendor name, date, amount, and category
- Automatically categorize expenses
- Save data to Google Sheets for easy tracking
- Track your spending over time

### System Requirements

- **Web Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Mobile**: Works on iOS and Android via web browser
- **Internet Connection**: Required for uploads and processing
- **Account**: Free account with email or Google Sign-In

---

## Account Setup

### Creating an Account

1. **Visit the Application**
   - Open your web browser and navigate to the app URL
   - You'll see the login page

2. **Sign Up Options**
   - **Option A: Email/Password**
     - Click "Sign Up" or "Create Account"
     - Enter your email address
     - Create a secure password (minimum 8 characters)
     - Click "Sign Up"
     - Check your email for verification link
   
   - **Option B: Google Sign-In** (Recommended)
     - Click "Sign in with Google"
     - Select your Google account
     - Grant permissions if prompted
     - You're automatically verified!

3. **Email Verification** (Email/Password only)
   - Check your email inbox (and spam folder)
   - Click the verification link
   - Return to the app and sign in
   - If you didn't receive the email, click "Resend Verification Email"

### First Login

1. Sign in with your credentials
2. You'll be redirected to the main upload page
3. Your account is ready to use!

---

## Uploading Receipts

### How to Upload a Receipt

#### Method 1: Click to Upload
1. On the main page, click the "Choose File" button
2. Select a receipt image from your device
3. Supported formats: JPG, PNG, GIF, WebP
4. Maximum file size: 20MB
5. The upload will start automatically

#### Method 2: Drag and Drop
1. Open the folder containing your receipt image
2. Drag the image file onto the upload area (dashed box)
3. Drop the file when you see the highlight
4. Upload starts automatically

### Upload Process

Once you upload a receipt:

1. **Upload Progress**
   - You'll see a progress bar showing upload status
   - Wait for the upload to complete

2. **Processing Status**
   - Status changes to "Processing..."
   - AI analyzes the receipt (takes 5-10 seconds)
   - Status updates in real-time

3. **Completion**
   - Status changes to "Complete" when done
   - Receipt data is extracted and saved
   - Data appears in your Google Sheet automatically

### What Data is Extracted?

The AI extracts the following information:
- **Vendor Name**: Store or business name
- **Date**: Transaction date (YYYY-MM-DD format)
- **Total Amount**: Grand total including tax
- **Category**: Automatically assigned category:
  - Maintenance
  - Cleaning Supplies
  - Utilities
  - Supplies
  - Other
- **Entity**: Your assigned entity (if applicable) - defaults to "Unassigned"
- **Timestamp**: When the receipt was processed

### Upload Tips

✅ **Best Practices:**
- Take clear, well-lit photos
- Ensure all text is readable
- Include the entire receipt in the photo
- Avoid shadows or glare
- Keep receipts flat when photographing

❌ **What to Avoid:**
- Blurry or out-of-focus images
- Receipts with heavy shadows
- Cropped or incomplete receipts
- Very low resolution images

---

## Viewing Your Data

### Upload History

On the main page, you can see:
- **Recent Uploads**: List of your uploaded receipts
- **Status**: Processing, Complete, or Error
- **Details**: Vendor name, date, amount, category
- **Timestamp**: When each receipt was processed

### Google Sheets Access

All your receipt data is automatically saved to a Google Sheet:

1. **Access Your Sheet**
   - Data is written automatically after processing
   - You'll receive a link to the sheet (if configured)
   - Or access it via the link provided by your administrator

2. **Sheet Columns**
   - Column A: Vendor Name
   - Column B: Date
   - Column C: Total Amount
   - Column D: Category
   - Column E: Timestamp
   - Column F: Entity (Phase 1.1 feature)

3. **Using the Data**
   - Sort and filter by any column
   - Create charts and pivot tables
   - Export to Excel or CSV
   - Share with your accountant or team

---

## Profile Management

### Accessing Your Profile

1. Click "Profile" in the navigation menu (top right)
2. You'll see your account information and statistics

### Profile Features

#### Account Information
- **Email Address**: Your registered email
- **Account Created**: When you signed up
- **Verification Status**: Whether your email is verified

#### Statistics Dashboard
- **Total Receipts**: Number of receipts uploaded
- **Total Amount**: Sum of all processed amounts
- **Success Rate**: Percentage of successful uploads
- **Recent Activity**: Count of recent receipts

#### Receipt History
- Complete list of all your uploaded receipts
- Shows vendor, date, amount, category, and status
- Sorted by most recent first

### Account Settings

#### Change Password (Email/Password users only)
1. Go to Profile page
2. Click "Change Password"
3. Enter your current password
4. Enter new password (twice for confirmation)
5. Click "Save"
6. You'll be signed out and need to sign in with new password

#### Resend Verification Email
1. If your email isn't verified, you'll see a "Resend Verification Email" button
2. Click it to send a new verification link
3. Check your email and click the link

---

## Troubleshooting

### Common Issues

#### Upload Fails
**Problem**: Receipt upload doesn't complete

**Solutions**:
- Check your internet connection
- Verify file size is under 20MB
- Try a different image format (JPG recommended)
- Clear browser cache and try again
- Check if you're signed in

#### Processing Takes Too Long
**Problem**: Status stays on "Processing..." for more than 30 seconds

**Solutions**:
- Wait a bit longer (processing can take up to 1 minute)
- Check your internet connection
- Refresh the page and check status
- If still processing after 2 minutes, contact support

#### Status Shows "Error"
**Problem**: Receipt processing failed

**Solutions**:
- Check if the receipt image is clear and readable
- Ensure the receipt contains visible text
- Try uploading a different photo of the same receipt
- Verify the receipt is actually a receipt (not a different document)
- Contact support if the issue persists

#### Can't Sign In
**Problem**: Unable to log in to your account

**Solutions**:
- Verify your email address is correct
- Check if your email is verified (check email for verification link)
- Try resetting your password
- Use "Sign in with Google" if you originally signed up with Google
- Clear browser cookies and try again

#### Email Verification Not Received
**Problem**: Didn't receive verification email

**Solutions**:
- Check spam/junk folder
- Wait a few minutes (emails can be delayed)
- Click "Resend Verification Email" on the login page
- Verify you entered the correct email address
- Try signing in with Google instead

### Getting Help

If you encounter issues not covered here:

1. **Check Status**: Look at the status indicator on your upload
2. **Review History**: Check your upload history for error messages
3. **Contact Support**: Reach out to your administrator
4. **Check Documentation**: Review this guide for detailed steps

---

## FAQs

### General Questions

**Q: Is the app free to use?**  
A: Yes, the basic features are free. Check with your administrator for any premium features.

**Q: What types of receipts can I upload?**  
A: Any receipt with clear text. Common types: store receipts, restaurant bills, gas station receipts, online purchase confirmations (screenshots).

**Q: How accurate is the AI extraction?**  
A: The AI is highly accurate (typically 95%+), but results depend on receipt quality. Clear, well-lit photos produce the best results.

**Q: Can I edit extracted data?**  
A: Currently, data is automatically saved. Edit functionality is coming in future updates. For now, you can edit data directly in Google Sheets.

**Q: What happens to my receipt images?**  
A: Images are stored securely in Firebase Storage. Only you and administrators can access your receipts.

**Q: Can I delete receipts?**  
A: Currently, receipts cannot be deleted through the app. Contact your administrator if you need to remove data.

**Q: Is my data secure?**  
A: Yes! All data is encrypted in transit and at rest. Only you and authorized administrators can access your data.

### Technical Questions

**Q: What browsers are supported?**  
A: Chrome, Firefox, Safari, and Edge (latest versions). Mobile browsers work too!

**Q: Can I use the app offline?**  
A: Currently, an internet connection is required. Offline support is planned for future updates.

**Q: How long does processing take?**  
A: Typically 5-10 seconds per receipt, depending on image size and server load.

**Q: Can I upload multiple receipts at once?**  
A: Currently, upload one receipt at a time. Batch upload is planned for future updates.

**Q: What is "Entity" in my receipts?**  
A: Entity is used for multi-entity businesses. If you're assigned to an entity, it appears in your receipts. Defaults to "Unassigned" if not assigned.

### Account Questions

**Q: Can I change my email address?**  
A: Currently, email changes require administrator assistance. Contact your admin to update your email.

**Q: Can I use multiple accounts?**  
A: Yes, you can create multiple accounts with different email addresses.

**Q: What if I forget my password?**  
A: Use the "Forgot Password" link on the login page to reset it.

**Q: Can I delete my account?**  
A: Account deletion requires administrator assistance. Contact your admin.

---

## Feature Updates

### Phase 1 Features (Current)

✅ **Entity Tracking** - Receipts now include entity assignment  
✅ **Multi-Language Support** - UI supports multiple languages (English default)  
✅ **Enhanced Profile** - Detailed statistics and receipt history  
✅ **Real-Time Status** - Live updates on receipt processing

### Coming Soon

📝 **Receipt Review** - Review and correct data before saving  
📝 **Batch Upload** - Upload multiple receipts at once  
📝 **Receipt Editing** - Edit processed receipts  
📝 **Advanced Analytics** - Spending charts and reports  
📝 **PDF Support** - Upload PDF receipts  
📝 **Offline Mode** - Work without internet connection

---

## Quick Reference

### Keyboard Shortcuts
- None currently available (coming soon)

### Supported File Formats
- JPG / JPEG
- PNG
- GIF
- WebP

### File Size Limits
- Maximum: 20MB per receipt
- Recommended: Under 5MB for faster processing

### Processing Time
- Average: 5-10 seconds
- Maximum: Up to 60 seconds for complex receipts

---

## Support

### Need Help?

- **Documentation**: See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for technical docs
- **Admin Support**: Contact your administrator for account issues
- **Technical Issues**: Check [TROUBLESHOOT_SHEETS_NOT_UPDATING.md](TROUBLESHOOT_SHEETS_NOT_UPDATING.md) for common problems

---

**Last Updated**: 2024-12-19  
**Version**: 1.0  
**Maintained By**: Development Team

