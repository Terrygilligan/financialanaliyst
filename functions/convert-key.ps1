# PowerShell script to convert Service Account JSON key to .env format
# Usage: .\convert-key.ps1 "path\to\sheets-writer.json"

param(
    [Parameter(Mandatory=$true)]
    [string]$KeyFilePath
)

if (-not (Test-Path $KeyFilePath)) {
    Write-Host "Error: File not found at $KeyFilePath" -ForegroundColor Red
    exit 1
}

Write-Host "Reading Service Account key file..." -ForegroundColor Green
$jsonContent = Get-Content $KeyFilePath -Raw | ConvertFrom-Json

# Convert back to JSON as a single-line string (compressed)
$jsonString = $jsonContent | ConvertTo-Json -Compress

# Escape single quotes for .env file
$jsonString = $jsonString -replace "'", "''"

Write-Host "`nCopy this line to your .env file:" -ForegroundColor Yellow
Write-Host "GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY='$jsonString'" -ForegroundColor Cyan

Write-Host "`nService Account Email: $($jsonContent.client_email)" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Copy the GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY line above" -ForegroundColor White
Write-Host "2. Paste it into functions/.env file" -ForegroundColor White
Write-Host "3. Use the email above to share your Google Sheet" -ForegroundColor White
