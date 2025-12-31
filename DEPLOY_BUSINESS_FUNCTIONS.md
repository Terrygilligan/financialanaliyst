# Deploy Business Management Functions

## Quick Deploy

The business management functions (`provisionNewBusiness`, `getBusinessDetails`, `updateBusinessSettings`, `addAuthorizedUser`) need to be deployed to fix the 404 errors.

### Option 1: Use Deployment Script (Recommended)

**PowerShell (Windows):**
```powershell
.\deploy.ps1
```

**Bash (Linux/Mac):**
```bash
./deploy.sh
```

### Option 2: Manual Deployment

```bash
# 1. Build the functions
cd functions
npm run build
cd ..

# 2. Deploy all business management functions
firebase deploy --only functions:provisionNewBusiness,functions:getBusinessDetails,functions:updateBusinessSettings,functions:addAuthorizedUser --project=<YOUR_PROJECT_ID>
```

## What Gets Deployed

- ✅ `provisionNewBusiness` - Creates new business with Google Drive folder and Sheet
- ✅ `getBusinessDetails` - Retrieves business information for authenticated users
- ✅ `updateBusinessSettings` - Updates business configuration (tabs, currency, timezone)
- ✅ `addAuthorizedUser` - Adds authorized users to a business

## Verify Deployment

After deployment, check the logs:
```bash
firebase functions:log --project=<YOUR_PROJECT_ID>
```

Then test the business signup page - the 404 errors should be resolved.

## Troubleshooting

If you see CORS errors after deployment:
- Wait 1-2 minutes for the functions to fully propagate
- Clear your browser cache
- Check that the functions are deployed to `us-central1` region (they should be)

