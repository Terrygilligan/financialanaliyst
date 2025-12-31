# Setup Service Account Roles Script (PowerShell)
# Creates the service account (if needed) and grants necessary IAM roles

$PROJECT_ID = "<YOUR_PROJECT_ID>"
$SERVICE_ACCOUNT_NAME = "backend-sa"
$SERVICE_ACCOUNT_EMAIL = "$SERVICE_ACCOUNT_NAME@${PROJECT_ID}.iam.gserviceaccount.com"

Write-Host "Setting up service account and IAM roles" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID"
Write-Host "Service Account: $SERVICE_ACCOUNT_EMAIL"
Write-Host ""

# Set the active project
Write-Host "Setting active project to $PROJECT_ID..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to set project" -ForegroundColor Red
    exit 1
}

# Check if service account exists
Write-Host ""
Write-Host "Checking if service account exists..." -ForegroundColor Yellow
$saCheck = gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Service account does not exist. Creating it..." -ForegroundColor Yellow
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME `
        --display-name="Backend Service Account" `
        --description="Service account for backend services and API Gateway" `
        --project=$PROJECT_ID
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Service account created successfully" -ForegroundColor Green
    } else {
        Write-Host "Error: Failed to create service account" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Service account already exists" -ForegroundColor Green
}

# Grant Secret Manager Secret Accessor role
Write-Host ""
Write-Host "Granting roles/secretmanager.secretAccessor role..." -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" `
    --role="roles/secretmanager.secretAccessor"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully granted roles/secretmanager.secretAccessor" -ForegroundColor Green
} else {
    Write-Host "Error: Failed to grant roles/secretmanager.secretAccessor" -ForegroundColor Red
    exit 1
}

# Grant Cloud Run Invoker role
Write-Host ""
Write-Host "Granting roles/run.invoker role..." -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" `
    --role="roles/run.invoker"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully granted roles/run.invoker" -ForegroundColor Green
} else {
    Write-Host "Error: Failed to grant roles/run.invoker" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Service account: $SERVICE_ACCOUNT_EMAIL" -ForegroundColor Cyan
Write-Host "Roles granted:" -ForegroundColor Cyan
Write-Host "  - roles/secretmanager.secretAccessor" -ForegroundColor Gray
Write-Host "  - roles/run.invoker" -ForegroundColor Gray
Write-Host ""
Write-Host "To verify, run:" -ForegroundColor Yellow
Write-Host "  gcloud projects get-iam-policy $PROJECT_ID --flatten='bindings[].members' --filter=`"bindings.members:serviceAccount:$SERVICE_ACCOUNT_EMAIL`"" -ForegroundColor Gray
