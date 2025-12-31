# User Guide - AI Financial Analyst

**Last Updated**: December 31, 2025
**Version**: 2.0 (Multi-Tenant SaaS Silos)

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

AI Financial Analyst is a secure, multi-tenant SaaS platform that automatically extracts financial data from receipt images using artificial intelligence. Simply upload a photo of your receipt, and the app will:

- Extract vendor name, date, amount, and category
- Automatically categorize expenses based on business rules
- Save data to your business's secure Firestore silo
- Track your spending over time with real-time statistics

### System Requirements

- **Web Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Mobile**: Works on iOS and Android; installable as a PWA
- **Internet Connection**: Required for uploads and processing
- **Account**: Secure account associated with your business silo

---

## Account Setup

### Joining a Business

1. **Invitation**: Your business administrator will create your account or invite you.
2. **First Login**: Use your credentials to sign in to the platform.
3. **Silo Context**: The system automatically detects your business association upon login.

---

## Uploading Receipts

### How to Upload a Receipt

#### Method 1: Click to Upload
1. On the main page, click the "Choose File" button.
2. Select a receipt image from your device.
3. Supported formats: JPG, PNG, GIF, WebP.
4. Maximum file size: 20MB.

#### Method 2: Drag and Drop
1. Drag the image file onto the upload area (dashed box).
2. Drop the file when you see the highlight.

### What Data is Extracted?

The AI extracts the following information:
- **Vendor Name**: Store or business name
- **Date**: Transaction date (YYYY-MM-DD format)
- **Total Amount**: Grand total including tax
- **Category**: Automatically assigned business category
- **Custom Fields**: Any additional fields defined by your administrator

---

## Viewing Your Data

### Upload History

On the main page, you can see:
- **Recent Uploads**: List of your uploaded receipts.
- **Status**: Processing, Complete, or Error.
- **Details**: Extracted data preview.

### Business Activity

All finalized receipts are stored securely in your business's Firestore silo. Your administrator can view aggregate data and export records for accounting.

---

## Profile Management

### Accessing Your Profile

1. Click "Profile" in the navigation menu.
2. You'll see your account information and statistics.

### Profile Features

#### Statistics Dashboard
- **Total Receipts**: Number of receipts you've uploaded.
- **Total Amount**: Sum of all your processed receipts.
- **Success Rate**: Percentage of successful extractions.

---

## Troubleshooting

### Status Shows "Error"
**Problem**: Receipt processing failed.

**Solutions**:
- Check if the receipt image is clear and readable.
- Ensure the receipt contains visible text.
- Try uploading a different photo of the same receipt.

### Can't Sign In
**Problem**: Unable to log in to your account.

**Solutions**:
- Verify your email address is correct.
- Ensure you are using the correct login method (Email/Password or Google).
- Contact your administrator to verify your account status.

---

## FAQs

**Q: Is my data secure?**  
A: Yes! The system uses modern multi-tenant architecture to ensure absolute isolation between different businesses. Your data is never mixed with other clients.

**Q: Can I edit extracted data?**  
A: If the review workflow is enabled, you can correct data before it is finalized.

**Q: Where are my images stored?**  
A: Images are stored in secure, path-isolated Cloud Storage buckets accessible only to authorized users in your business.

---

## Feature Updates

✅ **Silo Isolation** - Total data separation between businesses.
✅ **Dynamic Schemas** - Support for custom extraction fields.
✅ **PWA Support** - Install on your mobile home screen.
✅ **Real-Time Stats** - Instant updates on spending.

---

**Last Updated**: December 31, 2025  
**Maintained By**: Development Team
