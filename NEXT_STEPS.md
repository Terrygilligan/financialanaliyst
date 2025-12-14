# Next Steps - Google Sheet Setup

## ✅ What's Done

1. ✅ Service Account key added to `functions/.env`
2. ✅ Gemini API key configured
3. ✅ Code is ready to use the Service Account

## 📋 Your Service Account Email

**Important**: You need to share your Google Sheet with this email address:

```
financial-output@financialanaliyst.iam.gserviceaccount.com
```

## 🎯 Next Steps: Create and Configure Google Sheet

### Step 1: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **Blank** to create a new spreadsheet
3. Name it (e.g., "Financial Receipts" or "AI Financial Analyst")

### Step 2: Set Up Headers (Row 1)

In the first row, add these exact headers:

| Column A | Column B | Column C | Column D | Column E |
|----------|----------|----------|----------|----------|
| **Vendor Name** | **Date** | **Total Amount** | **Category** | **Timestamp** |

**Quick setup:**
- Click cell A1, type: `Vendor Name`
- Click cell B1, type: `Date`
- Click cell C1, type: `Total Amount`
- Click cell D1, type: `Category`
- Click cell E1, type: `Timestamp`

### Step 3: Share Sheet with Service Account

1. Click the **Share** button (top right corner)
2. In the "Add people and groups" field, paste:
   ```
   financial-output@financialanaliyst.iam.gserviceaccount.com
   ```
3. Make sure the permission is set to **Editor** (not Viewer)
4. **Uncheck** "Notify people" (Service Accounts don't have email)
5. Click **Share**

### Step 4: Get the Sheet ID

1. Look at the URL in your browser's address bar
2. The URL looks like:
   ```
   https://docs.google.com/spreadsheets/d/1fH-K0V123abcXYZ456def/edit
   ```
3. Copy the long string between `/d/` and `/edit`
   - In the example above: `1fH-K0V123abcXYZ456def`
   - This is your **Sheet ID**

### Step 5: Add Sheet ID to .env

1. Open `functions/.env` file
2. Find the line: `GOOGLE_SHEET_ID=`
3. Add your Sheet ID after the equals sign:
   ```
   GOOGLE_SHEET_ID=1fH-K0V123abcXYZ456def
   ```
   (Replace with your actual Sheet ID)

## ✅ Final Checklist

- [ ] Google Sheet created
- [ ] Headers added (Row 1): Vendor Name, Date, Total Amount, Category, Timestamp
- [ ] Sheet shared with: `financial-output@financialanaliyst.iam.gserviceaccount.com` (Editor access)
- [ ] Sheet ID copied from URL
- [ ] Sheet ID added to `functions/.env`

## 🚀 Once Complete

After you've added the Sheet ID to `.env`, your backend will be fully configured! You can then:

1. Build the functions: `cd functions && npm run build`
2. Deploy: `firebase deploy --only functions`
3. Test by uploading a receipt image to Firebase Storage

## 📝 Quick Reference

**Service Account Email** (for sharing Sheet):
```
financial-output@financialanaliyst.iam.gserviceaccount.com
```

**Current .env Status**:
- ✅ GEMINI_API_KEY - Configured
- ✅ GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY - Configured
- ⏳ GOOGLE_SHEET_ID - **Needs to be added**
