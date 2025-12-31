# Setup Cloud Environment Script (PowerShell)
# Sets up GCP project, service accounts, APIs, and permissions for <YOUR_PROJECT_ID>

$PROJECT_ID = "<YOUR_PROJECT_ID>"
$SERVICE_ACCOUNT_NAME = "backend-provisioner"
$SERVICE_ACCOUNT_EMAIL = "$SERVICE_ACCOUNT_NAME@${PROJECT_ID}.iam.gserviceaccount.com"

Write-Host "🚀 Setting up cloud environment for: $PROJECT_ID" -ForegroundColor Cyan
Write-Host ""

# Step 1: Set the active project
Write-Host "📋 Step 1: Setting active project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID
Write-Host "✅ Project set to: $PROJECT_ID" -ForegroundColor Green
Write-Host ""

# Step 2: Enable required APIs
Write-Host "📋 Step 2: Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable `
    drive.googleapis.com `
    sheets.googleapis.com `
    firestore.googleapis.com `
    cloudfunctions.googleapis.com `
    secretmanager.googleapis.com `
    iam.googleapis.com `
    --project=$PROJECT_ID
Write-Host "✅ APIs enabled" -ForegroundColor Green
Write-Host ""

# Step 3: Create service account (if it doesn't exist)
Write-Host "📋 Step 3: Creating service account..." -ForegroundColor Yellow
$saCheck = gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️  Service account already exists: $SERVICE_ACCOUNT_EMAIL" -ForegroundColor Yellow
} else {
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME `
        --display-name="Backend Provisioner Service Account" `
        --description="Service account for business provisioning and Google Drive/Sheets operations" `
        --project=$PROJECT_ID
    Write-Host "✅ Service account created: $SERVICE_ACCOUNT_EMAIL" -ForegroundColor Green
}
Write-Host ""

# Step 4: Grant IAM roles
Write-Host "📋 Step 4: Granting IAM roles..." -ForegroundColor Yellow

$ROLES = @(
    "roles/datastore.user",
    "roles/secretmanager.secretAccessor",
    "roles/iam.serviceAccountTokenCreator",
    "roles/run.invoker"
)

foreach ($ROLE in $ROLES) {
    Write-Host "   Granting $ROLE..." -ForegroundColor Gray
    gcloud projects add-iam-policy-binding $PROJECT_ID `
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" `
        --role="$ROLE" `
        --condition=None 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $ROLE granted" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $ROLE may already be granted" -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 5: Create service account key
Write-Host "📋 Step 5: Creating service account key..." -ForegroundColor Yellow
$KEY_FILE = ".\functions\service-account-key.json"

if (Test-Path $KEY_FILE) {
    Write-Host "⚠️  Key file already exists: $KEY_FILE" -ForegroundColor Yellow
    $overwrite = Read-Host "   Do you want to overwrite it? (y/N)"
    if ($overwrite -eq "y" -or $overwrite -eq "Y") {
        gcloud iam service-accounts keys create $KEY_FILE `
            --iam-account=$SERVICE_ACCOUNT_EMAIL `
            --project=$PROJECT_ID
        Write-Host "✅ Service account key created: $KEY_FILE" -ForegroundColor Green
    } else {
        Write-Host "   Skipping key creation..." -ForegroundColor Gray
    }
} else {
    gcloud iam service-accounts keys create $KEY_FILE `
        --iam-account=$SERVICE_ACCOUNT_EMAIL `
        --project=$PROJECT_ID
    Write-Host "✅ Service account key created: $KEY_FILE" -ForegroundColor Green
}
Write-Host ""

Write-Host "✨ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Share your Google Sheet template with: $SERVICE_ACCOUNT_EMAIL" -ForegroundColor Gray
Write-Host "   2. Set environment variable: `$env:GOOGLE_APPLICATION_CREDENTIALS=`"$KEY_FILE`"" -ForegroundColor Gray
Write-Host "   3. Or add to functions/.env: GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY=(content of key file)" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 To verify setup, run: .\verify-permissions.ps1" -ForegroundColor Cyan

