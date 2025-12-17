# Quick Start: Branch Workflow

## 🚀 Getting Started (First Time)

```powershell
# 1. Setup main feature branch
.\scripts\git-workflow.ps1 -Action setup
```

This creates `feature/sme-automation-upgrade` branch from `main`.

## 📋 Typical Workflow for Each Phase

### Step 1: Create Phase Branch
```powershell
.\scripts\git-workflow.ps1 -Action create-phase -Phase "0-security" -Description "Security hardening"
```

### Step 2: Make Your Changes
- Edit files
- Add new features
- Test locally

### Step 3: Merge Back
```powershell
.\scripts\git-workflow.ps1 -Action merge-phase -Phase "0-security" -CommitMessage "Phase 0: Add security checks"
```

### Step 4: Create Pull Request
- Go to GitHub
- Create PR: `feature/sme-automation-upgrade` → `main`
- Review and merge

## 🔄 Common Commands

```powershell
# Check current status
.\scripts\git-workflow.ps1 -Action status

# Update feature branch from main (after PR merged)
.\scripts\git-workflow.ps1 -Action update

# Show PR instructions
.\scripts\git-workflow.ps1 -Action pr
```

## 📝 Phase Branch Names

Use these standard names:

- `0-security` - Security hardening
- `1-entities` - Entity tracking
- `1-translations` - Multi-language support
- `1-archive` - Archive function
- `2-feature-flag` - Feature flag infrastructure
- `2-pending-receipts` - Pending receipts workflow
- `2-categories` - Category management
- `2-currency` - Currency conversion
- `2-validation` - VAT validation
- `2-admin-review` - Admin review interface
- `3-vat` - VAT extraction
- `3-accountant-tab` - Accountant CSV tab
- `3-audit` - Audit trail

## ⚠️ Important Notes

1. **Always start from `feature/sme-automation-upgrade`** when creating phase branches
2. **Never commit directly to `main`** - use Pull Requests
3. **Keep feature flag disabled** in production until ready
4. **Test locally** before merging phase branches

## 🆘 Quick Troubleshooting

**"Not on feature branch"**
```powershell
git checkout feature/sme-automation-upgrade
```

**"Merge conflicts"**
- Resolve manually, then:
```powershell
git push origin feature/sme-automation-upgrade
```

**"Need to update from main"**
```powershell
.\scripts\git-workflow.ps1 -Action update
```

## 📚 Full Documentation

See `BRANCH_WORKFLOW.md` for complete details.

