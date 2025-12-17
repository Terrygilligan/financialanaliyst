# Git Workflow Helper Script for SME Automation Upgrade
# PowerShell script to automate common branch operations

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("setup", "create-phase", "merge-phase", "update", "status", "pr", "help")]
    [string]$Action = "help",
    
    [Parameter(Mandatory=$false)]
    [string]$Phase = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Description = "",
    
    [Parameter(Mandatory=$false)]
    [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($Message) {
    Write-ColorOutput Green "✓ $Message"
}

function Write-Info($Message) {
    Write-ColorOutput Cyan "ℹ $Message"
}

function Write-Warning($Message) {
    Write-ColorOutput Yellow "⚠ $Message"
}

function Write-Error($Message) {
    Write-ColorOutput Red "✗ $Message"
}

# Check if we're in a git repository
function Test-GitRepo {
    if (-not (Test-Path .git)) {
        Write-Error "Not in a git repository. Please run this script from the repository root."
        exit 1
    }
}

# Get current branch name
function Get-CurrentBranch {
    return (git rev-parse --abbrev-ref HEAD)
}

# Setup: Create main feature branch
function Setup-FeatureBranch {
    Write-Info "Setting up main feature branch..."
    
    Test-GitRepo
    
    $currentBranch = Get-CurrentBranch
    if ($currentBranch -ne "main") {
        Write-Warning "Not on main branch. Current branch: $currentBranch"
        $response = Read-Host "Switch to main branch? (y/n)"
        if ($response -eq "y") {
            git checkout main
        } else {
            Write-Error "Please switch to main branch first"
            exit 1
        }
    }
    
    Write-Info "Pulling latest changes from main..."
    git pull origin main
    
    if (git rev-parse --verify feature/sme-automation-upgrade 2>$null) {
        Write-Warning "Feature branch already exists. Switching to it..."
        git checkout feature/sme-automation-upgrade
        git pull origin feature/sme-automation-upgrade
    } else {
        Write-Info "Creating feature branch: feature/sme-automation-upgrade"
        git checkout -b feature/sme-automation-upgrade
        git push -u origin feature/sme-automation-upgrade
        Write-Success "Feature branch created and pushed to remote"
    }
}

# Create a new phase branch
function Create-PhaseBranch {
    if ([string]::IsNullOrWhiteSpace($Phase)) {
        Write-Error "Phase number is required. Use -Phase '0-security' or -Phase '1-entities'"
        exit 1
    }
    
    if ([string]::IsNullOrWhiteSpace($Description)) {
        Write-Error "Description is required. Use -Description 'brief description'"
        exit 1
    }
    
    Test-GitRepo
    
    $currentBranch = Get-CurrentBranch
    if ($currentBranch -ne "feature/sme-automation-upgrade") {
        Write-Warning "Not on feature branch. Current: $currentBranch"
        $response = Read-Host "Switch to feature/sme-automation-upgrade? (y/n)"
        if ($response -eq "y") {
            git checkout feature/sme-automation-upgrade
            git pull origin feature/sme-automation-upgrade
        } else {
            Write-Error "Please switch to feature/sme-automation-upgrade first"
            exit 1
        }
    }
    
    $branchName = "feature/phase-$Phase"
    
    if (git rev-parse --verify $branchName 2>$null) {
        Write-Warning "Branch $branchName already exists. Switching to it..."
        git checkout $branchName
    } else {
        Write-Info "Creating phase branch: $branchName"
        git checkout -b $branchName
        Write-Success "Created and switched to branch: $branchName"
        Write-Info "Description: $Description"
        Write-Info ""
        Write-Info "Make your changes, then use:"
        Write-Info "  .\scripts\git-workflow.ps1 -Action merge-phase -Phase '$Phase' -CommitMessage 'Your commit message'"
    }
}

# Merge phase branch back to feature branch
function Merge-PhaseBranch {
    if ([string]::IsNullOrWhiteSpace($Phase)) {
        Write-Error "Phase number is required. Use -Phase '0-security'"
        exit 1
    }
    
    Test-GitRepo
    
    $phaseBranch = "feature/phase-$Phase"
    $currentBranch = Get-CurrentBranch
    
    if ($currentBranch -eq $phaseBranch) {
        # Check if there are uncommitted changes
        $status = git status --porcelain
        if ($status) {
            if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
                Write-Error "You have uncommitted changes. Please provide -CommitMessage"
                exit 1
            }
            
            Write-Info "Staging and committing changes..."
            git add .
            git commit -m $CommitMessage
            Write-Success "Changes committed"
            
            Write-Info "Pushing to remote..."
            git push origin $phaseBranch
            Write-Success "Pushed to remote"
        }
    } else {
        Write-Warning "Not on phase branch. Current: $currentBranch"
        Write-Info "Switching to phase branch to check status..."
        git checkout $phaseBranch
    }
    
    # Switch to feature branch
    Write-Info "Switching to feature branch..."
    git checkout feature/sme-automation-upgrade
    git pull origin feature/sme-automation-upgrade
    
    # Merge phase branch
    Write-Info "Merging $phaseBranch into feature/sme-automation-upgrade..."
    try {
        git merge $phaseBranch --no-ff -m "Merge $phaseBranch into feature branch"
        Write-Success "Merge successful"
        
        Write-Info "Pushing to remote..."
        git push origin feature/sme-automation-upgrade
        Write-Success "Merged and pushed to remote"
        
        Write-Info ""
        Write-Info "Next steps:"
        Write-Info "1. Create Pull Request on GitHub: feature/sme-automation-upgrade → main"
        Write-Info "2. Or continue with another phase branch"
    } catch {
        Write-Error "Merge failed. Please resolve conflicts manually."
        Write-Info "After resolving conflicts, run: git push origin feature/sme-automation-upgrade"
        exit 1
    }
}

# Update feature branch from main
function Update-FromMain {
    Test-GitRepo
    
    $currentBranch = Get-CurrentBranch
    
    Write-Info "Updating from main branch..."
    
    # Fetch latest
    git fetch origin
    
    # Update main
    Write-Info "Updating main branch..."
    git checkout main
    git pull origin main
    
    # Update feature branch
    Write-Info "Updating feature branch..."
    git checkout feature/sme-automation-upgrade
    git pull origin feature/sme-automation-upgrade
    
    # Merge main into feature
    Write-Info "Merging main into feature branch..."
    try {
        git merge main --no-ff -m "Update feature branch from main"
        Write-Success "Feature branch updated from main"
        
        Write-Info "Pushing to remote..."
        git push origin feature/sme-automation-upgrade
        Write-Success "Pushed to remote"
    } catch {
        Write-Error "Merge failed. Please resolve conflicts manually."
        exit 1
    }
}

# Show current status
function Show-Status {
    Test-GitRepo
    
    $currentBranch = Get-CurrentBranch
    Write-Info "Current branch: $currentBranch"
    Write-Info ""
    
    # Show branch list
    Write-Info "Feature branches:"
    git branch -a | Select-String "feature/" | ForEach-Object {
        $branch = $_.ToString().Trim()
        if ($branch -match "^\*") {
            Write-ColorOutput Green "  $branch"
        } else {
            Write-Output "  $branch"
        }
    }
    Write-Info ""
    
    # Show status
    Write-Info "Working directory status:"
    git status --short
    
    Write-Info ""
    Write-Info "Recent commits:"
    git log --oneline -5
}

# Show PR creation instructions
function Show-PRInstructions {
    $currentBranch = Get-CurrentBranch
    
    Write-Info "Pull Request Instructions"
    Write-Info "========================="
    Write-Info ""
    Write-Info "Current branch: $currentBranch"
    Write-Info ""
    Write-Info "To create a Pull Request:"
    Write-Info "1. Go to: https://github.com/Terrygilligan/financialanaliyst"
    Write-Info "2. Click 'Pull Requests' → 'New Pull Request'"
    Write-Info "3. Base: main ← Compare: $currentBranch"
    Write-Info "4. Fill in title and description"
    Write-Info "5. Request review and merge"
    Write-Info ""
    Write-Info "Or use GitHub CLI (if installed):"
    Write-Info "  gh pr create --base main --head $currentBranch --title 'Your PR Title' --body 'Description'"
}

# Show help
function Show-Help {
    Write-Info "Git Workflow Helper Script"
    Write-Info "=========================="
    Write-Info ""
    Write-Info "Usage: .\scripts\git-workflow.ps1 -Action <action> [options]"
    Write-Info ""
    Write-Info "Actions:"
    Write-Info "  setup              - Create main feature branch (feature/sme-automation-upgrade)"
    Write-Info "  create-phase      - Create a new phase branch"
    Write-Info "  merge-phase       - Merge phase branch back to feature branch"
    Write-Info "  update            - Update feature branch from main"
    Write-Info "  status            - Show current branch status"
    Write-Info "  pr                - Show PR creation instructions"
    Write-Info "  help              - Show this help message"
    Write-Info ""
    Write-Info "Examples:"
    Write-Info ""
    Write-Info "  # Setup feature branch"
    Write-Info "  .\scripts\git-workflow.ps1 -Action setup"
    Write-Info ""
    Write-Info "  # Create Phase 0 branch"
    Write-Info "  .\scripts\git-workflow.ps1 -Action create-phase -Phase '0-security' -Description 'Security hardening'"
    Write-Info ""
    Write-Info "  # Merge Phase 0 back"
    Write-Info "  .\scripts\git-workflow.ps1 -Action merge-phase -Phase '0-security' -CommitMessage 'Phase 0: Security checks'"
    Write-Info ""
    Write-Info "  # Update from main"
    Write-Info "  .\scripts\git-workflow.ps1 -Action update"
    Write-Info ""
    Write-Info "  # Check status"
    Write-Info "  .\scripts\git-workflow.ps1 -Action status"
}

# Main script logic
switch ($Action) {
    "setup" {
        Setup-FeatureBranch
    }
    "create-phase" {
        Create-PhaseBranch
    }
    "merge-phase" {
        Merge-PhaseBranch
    }
    "update" {
        Update-FromMain
    }
    "status" {
        Show-Status
    }
    "pr" {
        Show-PRInstructions
    }
    "help" {
        Show-Help
    }
    default {
        Show-Help
    }
}

