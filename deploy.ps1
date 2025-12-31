# Deployment Script for provisionNewBusiness Function (PowerShell)
# Enables required APIs and deploys the function to Firebase

$PROJECT_ID = "financialanaliyst"
# Deploy all business management functions
$FUNCTION_NAMES = @("provisionNewBusiness", "getBusinessDetails", "updateBusinessSettings", "addAuthorizedUser")

Write-Host "🚀 Deploying business management functions to project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Functions: $($FUNCTION_NAMES -join ', ')" -ForegroundColor Cyan
Write-Host ""

# Step 1: Set the active project
Write-Host "📋 Step 1: Setting active project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID
Write-Host "✅ Project set to: $PROJECT_ID" -ForegroundColor Green
Write-Host ""

# Step 2: Enable required APIs
Write-Host "📋 Step 2: Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable `
    cloudfunctions.googleapis.com `
    cloudbuild.googleapis.com `
    artifactregistry.googleapis.com `
    run.googleapis.com `
    eventarc.googleapis.com `
    pubsub.googleapis.com `
    storage.googleapis.com `
    --project=$PROJECT_ID

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ APIs enabled successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some APIs may already be enabled or there was an error" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Build the functions
Write-Host "📋 Step 3: Building functions..." -ForegroundColor Yellow
Set-Location functions
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please fix errors before deploying." -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Build successful" -ForegroundColor Green
Set-Location ..
Write-Host ""

# Step 4: Deploy all business management functions
Write-Host "📋 Step 4: Deploying business management functions..." -ForegroundColor Yellow
# Deploy all functions at once (Firebase CLI supports multiple function names)
firebase deploy --only functions:provisionNewBusiness,functions:getBusinessDetails,functions:updateBusinessSettings,functions:addAuthorizedUser --project=$PROJECT_ID

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ All business management functions deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✨ Deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "   - View all function logs: firebase functions:log --project=$PROJECT_ID" -ForegroundColor Gray
    Write-Host "   - Test business signup: Visit business-signup.html" -ForegroundColor Gray
    Write-Host "   - Monitor specific function: firebase functions:log --only provisionNewBusiness --project=$PROJECT_ID" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Check the error messages above." -ForegroundColor Red
    exit 1
}

