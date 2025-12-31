# Test Drive API Access Script
# Tests if service account can create and access Google Sheets

$PROJECT_ID = "<YOUR_PROJECT_ID>"
$SA_EMAIL = "backend-sa@${PROJECT_ID}.iam.gserviceaccount.com"

Write-Host "Testing Drive/Sheets API access for: $SA_EMAIL" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if service account can list files (basic Drive access)
Write-Host "Test 1: Testing Drive API access..." -ForegroundColor Yellow
try {
    $driveTest = gcloud drive files list `
        --impersonate-service-account="$SA_EMAIL" `
        --project=$PROJECT_ID `
        --page-size=1 `
        2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Drive API access: SUCCESS" -ForegroundColor Green
        Write-Host "Service account can access Drive API" -ForegroundColor Green
    } else {
        Write-Host "Drive API access: FAILED" -ForegroundColor Red
        Write-Host "Error: $driveTest" -ForegroundColor Red
    }
} catch {
    Write-Host "Drive API access: ERROR" -ForegroundColor Red
    Write-Host "Exception: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Check service account permissions summary
Write-Host "Test 2: Service Account IAM Roles:" -ForegroundColor Yellow
gcloud projects get-iam-policy $PROJECT_ID `
    --flatten="bindings[].members" `
    --filter="bindings.members:serviceAccount:$SA_EMAIL" `
    --format="table(bindings.role)" | cat
Write-Host ""

# Test 3: Verify required scopes/permissions
Write-Host "Test 3: Required Permissions Check:" -ForegroundColor Yellow
$REQUIRED_ROLES = @(
    "roles/secretmanager.secretAccessor",
    "roles/iam.serviceAccountTokenCreator",
    "roles/run.invoker",
    "roles/datastore.user"
)

$allGranted = $true
foreach ($ROLE in $REQUIRED_ROLES) {
    $hasRole = gcloud projects get-iam-policy $PROJECT_ID `
        --flatten="bindings[].members" `
        --filter="bindings.members:serviceAccount:$SA_EMAIL AND bindings.role:$ROLE" `
        --format="value(bindings.role)" 2>&1
    
    if ($hasRole -match $ROLE) {
        Write-Host "  $ROLE : GRANTED" -ForegroundColor Green
    } else {
        Write-Host "  $ROLE : MISSING" -ForegroundColor Red
        $allGranted = $false
    }
}
Write-Host ""

# Summary
Write-Host "Summary:" -ForegroundColor Cyan
if ($allGranted) {
    Write-Host "  All IAM roles are granted" -ForegroundColor Green
} else {
    Write-Host "  Some IAM roles are missing - run .\fix-permissions.ps1" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Note: 'Editor' role on Google Sheets is a file-level permission," -ForegroundColor Gray
Write-Host "      not an IAM role. It must be set by sharing the sheet with:" -ForegroundColor Gray
Write-Host "      $SA_EMAIL" -ForegroundColor Gray
Write-Host ""
Write-Host "To share a sheet:" -ForegroundColor Cyan
Write-Host "  1. Open your Google Sheet" -ForegroundColor Gray
Write-Host "  2. Click 'Share' button" -ForegroundColor Gray
Write-Host "  3. Add: $SA_EMAIL" -ForegroundColor Gray
Write-Host "  4. Grant 'Editor' role" -ForegroundColor Gray

