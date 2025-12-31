# Fix Permissions Script (PowerShell)
# Repairs IAM permissions for the backend service account

$PROJECT_ID = "<YOUR_PROJECT_ID>"
$SA_EMAIL = "backend-sa@${PROJECT_ID}.iam.gserviceaccount.com"

Write-Host "🛠️  Starting Repair for Project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Service Account: $SA_EMAIL"
Write-Host ""

# Step 1: Enable APIs
Write-Host "📋 Step 1: Enabling Drive and Sheets APIs..." -ForegroundColor Yellow
gcloud services enable drive.googleapis.com sheets.googleapis.com --project=$PROJECT_ID
Write-Host "✅ APIs enabled" -ForegroundColor Green
Write-Host ""

# Step 2: Grant Secret Manager Access
Write-Host "📋 Step 2: Granting Secret Manager access..." -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/secretmanager.secretAccessor" `
    --condition=None 2>&1 | Out-Null
Write-Host "✅ Secret Manager access granted" -ForegroundColor Green
Write-Host ""

# Step 3: Grant Service Account Token Creator
Write-Host "📋 Step 3: Granting Token Creator role..." -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/iam.serviceAccountTokenCreator" `
    --condition=None 2>&1 | Out-Null
Write-Host "✅ Token Creator role granted" -ForegroundColor Green
Write-Host ""

# Step 4: Grant Cloud Run Invoker
Write-Host "📋 Step 4: Granting Cloud Run Invoker role..." -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/run.invoker" `
    --condition=None 2>&1 | Out-Null
Write-Host "✅ Cloud Run Invoker role granted" -ForegroundColor Green
Write-Host ""

# Step 5: Grant Datastore User
Write-Host "📋 Step 5: Granting Datastore User role..." -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/datastore.user" `
    --condition=None 2>&1 | Out-Null
Write-Host "✅ Datastore User role granted" -ForegroundColor Green
Write-Host ""

Write-Host "✨ Repair Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Important: Ensure your Master Sheet is shared with: $SA_EMAIL" -ForegroundColor Cyan
Write-Host "   - Open your Google Sheet" -ForegroundColor Gray
Write-Host "   - Click 'Share' button" -ForegroundColor Gray
Write-Host "   - Add: $SA_EMAIL" -ForegroundColor Gray
Write-Host "   - Grant 'Editor' role" -ForegroundColor Gray
Write-Host ""
Write-Host "To verify permissions, run: .\verify-permissions.ps1" -ForegroundColor Cyan

