# Fix Project Name Script
# Replaces "financialanaliyst" with "financialanaliyst" throughout the codebase

$oldName = "financialanaliyst"
$newName = "financialanaliyst"
$rootDir = $PSScriptRoot
$filesChanged = 0
$replacementsCount = 0

Write-Host "Searching for '$oldName' in codebase..." -ForegroundColor Cyan

# Get all files (excluding node_modules, .git, and other common exclusions)
$files = Get-ChildItem -Path $rootDir -Recurse -File | Where-Object {
    $_.FullName -notmatch '\\node_modules\\' -and
    $_.FullName -notmatch '\\.git\\' -and
    $_.FullName -notmatch '\\lib\\' -and
    $_.FullName -notmatch '\\.next\\' -and
    $_.FullName -notmatch '\\dist\\' -and
    $_.FullName -notmatch '\\build\\' -and
    $_.FullName -notmatch '\\.cursor\\'
}

foreach ($file in $files) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -and $content -match $oldName) {
            $originalContent = $content
            $newContent = $content -replace [regex]::Escape($oldName), $newName
            
            if ($originalContent -ne $newContent) {
                $count = ([regex]::Matches($originalContent, [regex]::Escape($oldName))).Count
                Set-Content -Path $file.FullName -Value $newContent -NoNewline
                $relativePath = $file.FullName.Replace($rootDir, '.')
                $message = "Fixed: $relativePath ($count replacements)"
                Write-Host $message -ForegroundColor Green
                $filesChanged++
                $replacementsCount += $count
            }
        }
    }
    catch {
        $errorMsg = "Error processing $($file.FullName): $_"
        Write-Host $errorMsg -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   Files changed: $filesChanged" -ForegroundColor Green
Write-Host "   Total replacements: $replacementsCount" -ForegroundColor Green
Write-Host ""
Write-Host "Done! Review the changes before committing." -ForegroundColor Cyan
