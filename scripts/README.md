# Git Workflow Scripts

This directory contains helper scripts for managing the branch workflow during the SME Automation Upgrade.

## Quick Start

### Setup Feature Branch
```powershell
.\scripts\git-workflow.ps1 -Action setup
```

### Create a Phase Branch
```powershell
.\scripts\git-workflow.ps1 -Action create-phase -Phase "0-security" -Description "Security hardening"
```

### Merge Phase Branch Back
```powershell
.\scripts\git-workflow.ps1 -Action merge-phase -Phase "0-security" -CommitMessage "Phase 0: Add security checks"
```

### Update from Main
```powershell
.\scripts\git-workflow.ps1 -Action update
```

### Check Status
```powershell
.\scripts\git-workflow.ps1 -Action status
```

## Available Actions

- `setup` - Create main feature branch
- `create-phase` - Create a new phase branch
- `merge-phase` - Merge phase branch back to feature branch
- `update` - Update feature branch from main
- `status` - Show current branch status
- `pr` - Show PR creation instructions
- `help` - Show help message

## Examples

### Complete Phase 0 Workflow

```powershell
# 1. Setup (first time only)
.\scripts\git-workflow.ps1 -Action setup

# 2. Create Phase 0 branch
.\scripts\git-workflow.ps1 -Action create-phase -Phase "0-security" -Description "Security hardening"

# 3. Make your changes...
# Edit files, add security checks, etc.

# 4. Merge back (commits and merges automatically)
.\scripts\git-workflow.ps1 -Action merge-phase -Phase "0-security" -CommitMessage "Phase 0: Add pre-deployment security checks"

# 5. Create PR on GitHub
.\scripts\git-workflow.ps1 -Action pr
```

### Working on Multiple Phases

```powershell
# Phase 1.1: Entities
.\scripts\git-workflow.ps1 -Action create-phase -Phase "1-entities" -Description "Entity tracking"
# ... make changes ...
.\scripts\git-workflow.ps1 -Action merge-phase -Phase "1-entities" -CommitMessage "Phase 1.1: Add entity tracking"

# Phase 1.2: Translations
.\scripts\git-workflow.ps1 -Action create-phase -Phase "1-translations" -Description "Multi-language support"
# ... make changes ...
.\scripts\git-workflow.ps1 -Action merge-phase -Phase "1-translations" -CommitMessage "Phase 1.2: Add translations"
```

## Notes

- The script automatically handles branch switching
- It checks for uncommitted changes before merging
- It pushes to remote automatically
- Merge conflicts must be resolved manually

## Troubleshooting

**Error: "Not in a git repository"**
- Make sure you're running the script from the repository root

**Error: "Not on feature branch"**
- The script will prompt to switch branches, or you can switch manually first

**Merge conflicts**
- Resolve conflicts manually, then push:
  ```powershell
  git push origin feature/sme-automation-upgrade
  ```

**Script not found**
- Make sure you're in the repository root
- Use: `.\scripts\git-workflow.ps1` (not `scripts\git-workflow.ps1`)

