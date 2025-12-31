# Verify Permissions Script (PowerShell)
# Checks if service account has correct permissions and can access resources

$PROJECT_ID = "financialanaliyst"
$SA_EMAIL = "backend-sa@${PROJECT_ID}.iam.gserviceaccount.com"

Write-Host "Verifying permissions for: $SA_EMAIL" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID"
Write-Host ""

# Check 1: Verify service account exists
Write-Host "Check 1: Verifying service account exists..." -ForegroundColor Yellow
$saCheck = gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Service account exists" -ForegroundColor Green
} else {
    Write-Host "Service account NOT found: $SA_EMAIL" -ForegroundColor Red
    Write-Host "   Run: .\setup-cloud.ps1 to create it" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Check 2: Verify APIs are enabled
Write-Host "Check 2: Verifying APIs are enabled..." -ForegroundColor Yellow
$APIS = @("drive.googleapis.com", "sheets.googleapis.com")

foreach ($API in $APIS) {
    $enabled = gcloud services list --enabled --project=$PROJECT_ID --filter="name:$API" --format="value(name)" 2>&1
    if ($enabled -match $API) {
        Write-Host "$API is enabled" -ForegroundColor Green
    } else {
        Write-Host "$API is NOT enabled" -ForegroundColor Red
        Write-Host "   Run: gcloud services enable $API --project=$PROJECT_ID" -ForegroundColor Yellow
    }
}
Write-Host ""

# Check 3: Verify IAM roles
Write-Host "Check 3: Verifying IAM roles..." -ForegroundColor Yellow
$ROLES = @(
    "roles/secretmanager.secretAccessor",
    "roles/iam.serviceAccountTokenCreator",
    "roles/run.invoker",
    "roles/datastore.user"
)

foreach ($ROLE in $ROLES) {
    $policy = gcloud projects get-iam-policy $PROJECT_ID `
        --flatten="bindings[].members" `
        --filter="bindings.members:serviceAccount:$SA_EMAIL AND bindings.role:$ROLE" `
        --format="value(bindings.role)" 2>&1
    
    if ($policy -match $ROLE) {
        Write-Host "$ROLE granted" -ForegroundColor Green
    } else {
        Write-Host "$ROLE NOT granted" -ForegroundColor Red
        Write-Host "   Run: .\fix-permissions.ps1 to fix" -ForegroundColor Yellow
    }
}
Write-Host ""

# Check 4: Verify service account key exists
Write-Host "Check 4: Verifying service account key file..." -ForegroundColor Yellow
$KEY_FILE = ".\functions\service-account-key.json"

if (Test-Path $KEY_FILE) {
    Write-Host "Key file exists: $KEY_FILE" -ForegroundColor Green
    
    try {
        $keyContent = Get-Content $KEY_FILE | ConvertFrom-Json
        Write-Host "Key file is valid JSON" -ForegroundColor Green
        
        if ($keyContent.project_id -eq $PROJECT_ID) {
            Write-Host "Key file project_id matches: $PROJECT_ID" -ForegroundColor Green
        } else {
            Write-Host "Key file project_id mismatch: $($keyContent.project_id) (expected: $PROJECT_ID)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Key file is NOT valid JSON" -ForegroundColor Red
    }
} else {
    Write-Host "Key file NOT found: $KEY_FILE" -ForegroundColor Yellow
    Write-Host "   Run: gcloud iam service-accounts keys create $KEY_FILE --iam-account=$SA_EMAIL" -ForegroundColor Yellow
}
Write-Host ""

# Check 5: Test Drive API access (if template ID provided)
if ($args.Count -gt 0) {
    $TEMPLATE_ID = $args[0]
    Write-Host "Check 5: Testing Drive API access to template..." -ForegroundColor Yellow
    Write-Host "   Template ID: $TEMPLATE_ID" -ForegroundColor Gray
    
    $driveTest = gcloud drive files describe "$TEMPLATE_ID" `
        --impersonate-service-account="$SA_EMAIL" `
        --project=$PROJECT_ID 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Service account can access template" -ForegroundColor Green
    } else {
        Write-Host "Service account CANNOT access template" -ForegroundColor Red
        Write-Host "   Make sure the sheet is shared with: $SA_EMAIL" -ForegroundColor Yellow
        Write-Host "   Grant Editor role in Google Sheets" -ForegroundColor Yellow
    }
} else {
    Write-Host "Check 5: Skipping Drive API test (no template ID provided)" -ForegroundColor Yellow
    Write-Host "   To test: .\verify-permissions.ps1 [TEMPLATE_ID]" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Verification complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Tips:" -ForegroundColor Cyan
Write-Host "   - If any checks failed, run: .\fix-permissions.ps1" -ForegroundColor Gray
Write-Host "   - To test Drive access: .\verify-permissions.ps1 [YOUR_SHEET_ID]" -ForegroundColor Gray
$clearUrl = "http://localhost:8080/emulator/v1/projects/$PROJECT_ID/databases/(default)/documents"
Write-Host "   - To clear emulator data: Invoke-WebRequest -Method DELETE -Uri `"$clearUrl`"" -ForegroundColor Gray
