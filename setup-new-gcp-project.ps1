# Setup New Google Cloud Project Script (PowerShell)
# Creates a new GCP project with the correct name and enables necessary APIs
# Usage: .\setup-new-gcp-project.ps1 [-BillingAccountId "ACCOUNT_ID"] [-ProjectId "PROJECT_ID"]

param(
    [string]$BillingAccountId = "",
    [string]$ProjectId = "<YOUR_PROJECT_ID>"
)

$PROJECT_ID = $ProjectId
$PROJECT_NAME = "AI Financial Analyst"
$BILLING_ACCOUNT_ID = $BillingAccountId

Write-Host "Setting up Google Cloud project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host ""

# Step 1: List billing accounts and get ID if not provided
if ([string]::IsNullOrWhiteSpace($BILLING_ACCOUNT_ID)) {
    Write-Host "Step 1: Listing available billing accounts..." -ForegroundColor Yellow
    Write-Host ""
    gcloud billing accounts list
    Write-Host ""
    $BILLING_ACCOUNT_ID = Read-Host "Enter your billing account ID"
}

if ([string]::IsNullOrWhiteSpace($BILLING_ACCOUNT_ID)) {
    Write-Host "Error: Billing account ID is required" -ForegroundColor Red
    Write-Host "Usage: .\setup-new-gcp-project.ps1 -BillingAccountId 'ACCOUNT_ID' [-ProjectId 'PROJECT_ID']" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check if project exists or create it
Write-Host ""
Write-Host "Step 2: Checking project '$PROJECT_ID'..." -ForegroundColor Yellow

# Try to describe the project to see if we have access
$projectCheck = gcloud projects describe $PROJECT_ID 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Project exists and is accessible. Continuing with setup..." -ForegroundColor Green
} else {
    # Project doesn't exist or we don't have access - try to create it
    Write-Host "Project does not exist or is not accessible. Attempting to create..." -ForegroundColor Yellow
    gcloud projects create $PROJECT_ID --name="$PROJECT_NAME"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Error: Cannot create or access project '$PROJECT_ID'" -ForegroundColor Red
        Write-Host "The project ID may be:" -ForegroundColor Yellow
        Write-Host "  - Already in use by another project" -ForegroundColor Yellow
        Write-Host "  - Reserved by Google" -ForegroundColor Yellow
        Write-Host "  - Owned by a different organization" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Suggested alternatives:" -ForegroundColor Cyan
        Write-Host "  - <YOUR_PROJECT_ID>-app" -ForegroundColor Gray
        Write-Host "  - <YOUR_PROJECT_ID>-prod" -ForegroundColor Gray
        Write-Host "  - <YOUR_PROJECT_ID>-2025" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Run with: .\setup-new-gcp-project.ps1 -BillingAccountId '$BILLING_ACCOUNT_ID' -ProjectId 'ALTERNATIVE_ID'" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Project created successfully!" -ForegroundColor Green
}

# Step 3: Set the project as active
Write-Host ""
Write-Host "Step 3: Setting project as active..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID
Write-Host "Project set as active" -ForegroundColor Green

# Step 4: Link billing account
Write-Host ""
Write-Host "Step 4: Linking billing account..." -ForegroundColor Yellow
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT_ID

if ($LASTEXITCODE -ne 0) {
    $billingCheck = gcloud billing projects describe $PROJECT_ID 2>&1
    if ($billingCheck -match "billingAccountName") {
        Write-Host "Billing account already linked." -ForegroundColor Green
    } else {
        Write-Host "Warning: Failed to link billing account" -ForegroundColor Yellow
    }
} else {
    Write-Host "Billing account linked successfully!" -ForegroundColor Green
}

# Step 5: Enable required APIs
Write-Host ""
Write-Host "Step 5: Enabling required APIs..." -ForegroundColor Yellow

$APIS = @(
    "iam.googleapis.com",
    "firestore.googleapis.com",
    "sheets.googleapis.com",
    "drive.googleapis.com",
    "cloudfunctions.googleapis.com",
    "storage-component.googleapis.com",
    "firebase.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "aiplatform.googleapis.com"
)

$enabledCount = 0
$failedCount = 0

foreach ($api in $APIS) {
    Write-Host "   Enabling $api..." -ForegroundColor Gray
    gcloud services enable $api --project=$PROJECT_ID
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   $api enabled" -ForegroundColor Green
        $enabledCount++
    } else {
        Write-Host "   Warning: Failed to enable $api" -ForegroundColor Yellow
        $failedCount++
    }
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "   APIs enabled: $enabledCount" -ForegroundColor Green
if ($failedCount -gt 0) {
    Write-Host "   APIs failed: $failedCount" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Create a Firebase project linked to this GCP project (if not already done)"
Write-Host "   2. Create a service account for Google Sheets/Drive access"
Write-Host "   3. Update your Firebase project ID in .firebaserc to: $PROJECT_ID"
Write-Host "   4. Update environment variables with new service account credentials"
Write-Host ""
Write-Host "Current active project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "To verify: gcloud config get-value project" -ForegroundColor Gray
