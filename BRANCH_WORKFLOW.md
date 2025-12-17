# GitHub Branch Workflow for SME Automation Upgrade

This document outlines the safe branch-based development strategy for implementing the SME Automation & Compliance features without breaking existing production functionality.

## Branch Structure

```
main (production - protected)
  │
  ├── feature/sme-automation-upgrade (main feature branch)
  │   ├── feature/phase-0-security
  │   ├── feature/phase-1-entities
  │   ├── feature/phase-2-pending-receipts
  │   ├── feature/phase-2-validation
  │   ├── feature/phase-2-currency
  │   ├── feature/phase-3-vat-compliance
  │   └── feature/phase-3-accountant-tab
  │
  └── hotfix/* (emergency fixes to main)
```

## Branch Naming Convention

- `main` - Production-ready code, always deployable
- `feature/sme-automation-upgrade` - Main feature branch for all new work
- `feature/phase-X-description` - Individual phase branches
- `hotfix/description` - Emergency fixes to production

## Workflow Overview

1. **Develop** on feature branches
2. **Test** on staging environment
3. **Review** via Pull Requests
4. **Merge** to main with feature flag disabled
5. **Enable** gradually in production

---

## Phase 0: Setup & Security (Week 1)

### Step 1: Create Main Feature Branch

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create main feature branch
git checkout -b feature/sme-automation-upgrade
git push -u origin feature/sme-automation-upgrade
```

### Step 2: Phase 0 - Security Hardening

```bash
# Create Phase 0 branch
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-0-security

# Make security changes:
# - Update .gitignore
# - Add security check scripts
# - Add GitHub Actions workflow
# - Update documentation

# Commit changes
git add .
git commit -m "Phase 0: Add pre-deployment security checks

- Enhanced .gitignore with comprehensive secret patterns
- Added pre-commit security validation script
- Created GitHub Actions security workflow
- Added secret scanning configuration
- Updated documentation with security notices"

# Push branch
git push origin feature/phase-0-security
```

### Step 3: Create Pull Request for Phase 0

1. Go to GitHub
2. Create PR: `feature/phase-0-security` → `main`
3. Title: "Phase 0: Pre-Deployment Security Hardening"
4. Description: "Adds security checks, no code changes to existing functionality"
5. Review and merge to `main`
6. After merge, update feature branch:

```bash
git checkout feature/sme-automation-upgrade
git merge main
git push origin feature/sme-automation-upgrade
```

---

## Phase 1: Foundation Features (Week 2)

### Step 1: Entity Tracking

```bash
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-1-entities

# Make changes:
# - Create functions/src/entities.ts
# - Update functions/src/schema.ts (add optional entity field)
# - Update functions/src/index.ts (add entity lookup)
# - All changes are additive, no breaking changes

git add .
git commit -m "Phase 1.1: Add entity tracking system

- Create entities.ts utility for entity lookup
- Add optional entity field to ReceiptData schema
- Add entity lookup in analyzeReceiptUpload
- Default to 'Unassigned' if no entity found
- Backward compatible: existing receipts unaffected"

git push origin feature/phase-1-entities
```

### Step 2: Multi-Language Support

```bash
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-1-translations

# Make changes:
# - Create public/translations.js
# - Update public/app.js, profile.js, admin.js
# - Add translation function

git add .
git commit -m "Phase 1.2: Add multi-language UI support

- Create translations.js with language dictionaries
- Add translateUI() function
- Update all JS files to use translations
- Falls back to English if translation missing
- Backward compatible: no breaking changes"

git push origin feature/phase-1-translations
```

### Step 3: Archive Function

```bash
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-1-archive

# Make changes:
# - Create functions/src/archive.ts
# - Export archiveData function in index.ts

git add .
git commit -m "Phase 1.3: Add archive automation function

- Create archiveData HTTP callable function
- Admin-only function to archive old data
- New function, doesn't affect existing workflow"

git push origin feature/phase-1-archive
```

### Step 4: Merge Phase 1 Features

```bash
# Merge each phase branch into main feature branch
git checkout feature/sme-automation-upgrade

git merge feature/phase-1-entities
git merge feature/phase-1-translations
git merge feature/phase-1-archive

# Resolve any conflicts
git push origin feature/sme-automation-upgrade
```

### Step 5: Create PR for Phase 1

1. Create PR: `feature/sme-automation-upgrade` → `main`
2. Title: "Phase 1: Foundation Features (Entity Tracking, Translations, Archive)"
3. Description: "All changes are additive. No breaking changes to existing workflow."
4. Review and merge to `main`

---

## Phase 2: Core Workflow (Week 3-4)

### Step 1: Add Feature Flag Infrastructure

```bash
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-2-feature-flag

# Add feature flag support:
# - Add ENABLE_REVIEW_WORKFLOW environment variable
# - Update analyzeReceiptUpload to check flag
# - Keep existing workflow as default

git add .
git commit -m "Phase 2: Add feature flag infrastructure

- Add ENABLE_REVIEW_WORKFLOW environment variable
- Update analyzeReceiptUpload to support both workflows
- Default to existing workflow (flag = false)
- Zero risk: existing code unchanged when flag disabled"

git push origin feature/phase-2-feature-flag
```

### Step 2: Pending Receipts System

```bash
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-2-pending-receipts

# Make changes:
# - Create functions/src/finalize.ts
# - Update functions/src/index.ts (add pending workflow)
# - Create public/review.html and review.js
# - All behind feature flag

git add .
git commit -m "Phase 2.1: Add pending receipts workflow

- Create finalizeReceipt function
- Add pending workflow to analyzeReceiptUpload (behind flag)
- Create review UI for user corrections
- Feature flag protected: no impact when disabled"

git push origin feature/phase-2-pending-receipts
```

### Step 3: Category Management

```bash
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-2-categories

# Make changes:
# - Create functions/src/categories.ts
# - Update review.js to use Firestore categories
# - Keep existing Category enum as fallback

git add .
git commit -m "Phase 2.2: Add dynamic category management

- Create categories.ts for CRUD operations
- Add /categories Firestore collection
- Update review UI to use dynamic categories
- Existing Category enum remains as fallback"

git push origin feature/phase-2-categories
```

### Step 4: Currency Conversion

```bash
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-2-currency

# Make changes:
# - Create functions/src/currency.ts
# - Add /fx_cache Firestore collection
# - Update schema with currency fields
# - Add BASE_CURRENCY environment variable

git add .
git commit -m "Phase 2.4: Add currency conversion with caching

- Create currency.ts with caching and fallback
- Add /fx_cache collection for rate storage
- Add BASE_CURRENCY environment variable
- Graceful error handling with admin alerts"

git push origin feature/phase-2-currency
```

### Step 5: Validation System

```bash
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-2-validation

# Make changes:
# - Create functions/src/validation.ts
# - Add VAT ID validation
# - Update review.js with mandatory category
# - Update finalizeReceipt with validation

git add .
git commit -m "Phase 2.5: Add VAT ID and category validation

- Create validation.ts for VAT format checking
- Make category dropdown mandatory in review UI
- Add validation to finalizeReceipt
- Set status to needs_admin_review on validation failure"

git push origin feature/phase-2-validation
```

### Step 6: Admin Review Interface

```bash
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-2-admin-review

# Make changes:
# - Create public/admin-review.html
# - Create public/admin-review.js
# - Update admin.html with link

git add .
git commit -m "Phase 2.6: Add admin review interface

- Create admin-review.html for manual intervention
- Display receipts needing admin review
- Allow admin override and corrections
- New interface, doesn't affect existing admin"

git push origin feature/phase-2-admin-review
```

### Step 7: Merge Phase 2 Features

```bash
git checkout feature/sme-automation-upgrade

# Merge all Phase 2 branches
git merge feature/phase-2-feature-flag
git merge feature/phase-2-pending-receipts
git merge feature/phase-2-categories
git merge feature/phase-2-currency
git merge feature/phase-2-validation
git merge feature/phase-2-admin-review

# Resolve conflicts if any
git push origin feature/sme-automation-upgrade
```

### Step 8: Create PR for Phase 2

1. Create PR: `feature/sme-automation-upgrade` → `main`
2. Title: "Phase 2: Core Workflow (Pending Receipts, Validation, Currency)"
3. Description: "All features behind ENABLE_REVIEW_WORKFLOW flag. Production unchanged when flag disabled."
4. **Important**: Set `ENABLE_REVIEW_WORKFLOW=false` in production after merge
5. Review and merge to `main`

---

## Phase 3: Compliance Features (Week 5)

### Step 1: Enhanced VAT Extraction

```bash
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-3-vat

# Make changes:
# - Update functions/src/schema.ts (add VAT fields)
# - Update functions/src/gemini.ts (enhance prompt)
# - All fields optional for backward compatibility

git add .
git commit -m "Phase 3.1: Enhance Gemini schema for VAT extraction

- Add VAT fields to ReceiptData schema (all optional)
- Update Gemini prompt to extract VAT details
- Add supplierVatNumber and vatBreakdown fields
- Backward compatible: existing receipts unaffected"

git push origin feature/phase-3-vat
```

### Step 2: Accountant CSV Tab

```bash
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-3-accountant-tab

# Make changes:
# - Update functions/src/sheets.ts (add accountant tab function)
# - Update functions/src/finalize.ts (write to both tabs)
# - Add retry logic and error handling

git add .
git commit -m "Phase 3.2: Add accountant CSV-ready sheet tab

- Add appendToAccountantSheet function with retry logic
- Create Accountant_CSV_Ready tab in Google Sheets
- Write to both main and accountant tabs
- Resilient error handling with partial success support"

git push origin feature/phase-3-accountant-tab
```

### Step 3: Audit Trail & Error Logging

```bash
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-3-audit

# Make changes:
# - Create functions/src/error-logging.ts
# - Update all functions with error logging
# - Add audit trail columns to Sheets
# - Create /error_logs Firestore collection

git add .
git commit -m "Phase 3.3: Add audit trail and error logging

- Create structured error logging system
- Add /error_logs Firestore collection
- Add audit flag columns to Google Sheets
- Enhanced audit trail with full JSON history"

git push origin feature/phase-3-audit
```

### Step 4: Merge Phase 3 Features

```bash
git checkout feature/sme-automation-upgrade

git merge feature/phase-3-vat
git merge feature/phase-3-accountant-tab
git merge feature/phase-3-audit

git push origin feature/sme-automation-upgrade
```

### Step 5: Create PR for Phase 3

1. Create PR: `feature/sme-automation-upgrade` → `main`
2. Title: "Phase 3: Compliance Features (VAT, Accountant Tab, Audit Trail)"
3. Description: "All features backward compatible. New fields are optional."
4. Review and merge to `main`

---

## Testing Strategy

### Local Testing

```bash
# Test on feature branch locally
git checkout feature/sme-automation-upgrade

# Run Firebase emulators
cd functions
npm run build
firebase emulators:start

# Test new features
# - Upload test receipt
# - Verify pending workflow
# - Test review UI
# - Test currency conversion
# - Test validation
```

### Staging Environment

1. Create separate Firebase project: `financialanaliyst-staging`
2. Deploy feature branch to staging:

```bash
git checkout feature/sme-automation-upgrade
firebase use staging
firebase deploy --only functions,hosting
```

3. Test with real data in staging
4. Verify all features work correctly

### Production Deployment

1. Merge PR to `main`
2. Deploy from `main`:

```bash
git checkout main
git pull origin main
firebase use production
firebase deploy --only functions,hosting
```

3. **Keep feature flag disabled initially:**
   - Set `ENABLE_REVIEW_WORKFLOW=false` in production
   - Verify existing workflow still works
   - Monitor for any issues

4. Enable gradually:
   - Enable for test users first
   - Monitor for 24-48 hours
   - Enable globally if no issues

---

## Rollback Procedures

### Option 1: Disable Feature Flag

```bash
# In Firebase Console or environment variables
ENABLE_REVIEW_WORKFLOW=false

# Production immediately reverts to old workflow
# No code changes needed
```

### Option 2: Revert Merge Commit

```bash
# Find the merge commit hash
git log --oneline main

# Revert the merge
git checkout main
git revert -m 1 <merge-commit-hash>
git push origin main

# Redeploy
firebase deploy --only functions,hosting
```

### Option 3: Hotfix Branch

```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/disable-new-features

# Revert specific changes
# Or set feature flag to false in code

git commit -m "Hotfix: Disable new features"
git push origin hotfix/disable-new-features

# Create PR and merge immediately
```

---

## Branch Protection Rules

Set up in GitHub repository settings:

### Main Branch Protection

1. **Require pull request reviews**
   - Required approvals: 1
   - Dismiss stale reviews: Yes

2. **Require status checks**
   - Require branches to be up to date: Yes
   - Add security check workflow

3. **Restrictions**
   - Do not allow force pushes
   - Do not allow deletions
   - Require linear history: Optional

4. **Rules**
   - Include administrators: No (enforce for everyone)

### Feature Branch Guidelines

- No protection needed (can push directly)
- Use descriptive commit messages
- Keep commits focused (one feature per commit)
- Push frequently to backup work

---

## Commit Message Convention

Use clear, descriptive commit messages:

```
Phase X.Y: Brief description

- Detailed change 1
- Detailed change 2
- Backward compatibility note (if applicable)
```

Examples:

```
Phase 2.1: Add pending receipts workflow

- Create finalizeReceipt function
- Add pending workflow to analyzeReceiptUpload (behind flag)
- Create review UI for user corrections
- Feature flag protected: no impact when disabled
```

```
Phase 2.4: Add currency conversion with caching

- Create currency.ts with caching and fallback
- Add /fx_cache collection for rate storage
- Add BASE_CURRENCY environment variable
- Graceful error handling with admin alerts
- Backward compatible: existing receipts unaffected
```

---

## Environment Variables Management

### Development (Local)

Create `functions/.env.local`:
```env
ENABLE_REVIEW_WORKFLOW=true
BASE_CURRENCY=GBP
```

### Staging

Set in Firebase Console:
```env
ENABLE_REVIEW_WORKFLOW=true
BASE_CURRENCY=GBP
```

### Production

Set in Firebase Console:
```env
ENABLE_REVIEW_WORKFLOW=false  # Start disabled
BASE_CURRENCY=GBP
```

**Enable gradually:**
1. Week 1: `ENABLE_REVIEW_WORKFLOW=false` (old workflow)
2. Week 2: Enable for test users via user preference
3. Week 3: Enable globally `ENABLE_REVIEW_WORKFLOW=true`

---

## Checklist Before Each PR

- [ ] All tests pass locally
- [ ] Code follows existing patterns
- [ ] No breaking changes (or clearly documented)
- [ ] Feature flag included (if changing workflow)
- [ ] Backward compatibility verified
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] Branch is up to date with main
- [ ] No secrets in code
- [ ] Security checks pass

---

## Timeline Estimate

- **Week 1**: Phase 0 (Security) - Can merge immediately
- **Week 2**: Phase 1 (Foundation) - Safe to merge
- **Week 3-4**: Phase 2 (Core Workflow) - Merge with flag disabled
- **Week 5**: Phase 3 (Compliance) - Merge with flag disabled
- **Week 6**: Testing and gradual enablement
- **Week 7+**: Full production rollout

---

## Quick Reference Commands

```bash
# Create new phase branch
git checkout feature/sme-automation-upgrade
git checkout -b feature/phase-X-description

# Work and commit
git add .
git commit -m "Phase X: Description"
git push origin feature/phase-X-description

# Merge back to feature branch
git checkout feature/sme-automation-upgrade
git merge feature/phase-X-description
git push origin feature/sme-automation-upgrade

# Update from main
git checkout feature/sme-automation-upgrade
git merge main
git push origin feature/sme-automation-upgrade

# Create PR on GitHub
# feature/sme-automation-upgrade → main

# After PR merged, update feature branch
git checkout feature/sme-automation-upgrade
git merge main
git push origin feature/sme-automation-upgrade
```

---

## Support & Questions

If you encounter issues:

1. **Merge conflicts**: Resolve carefully, test after resolution
2. **Breaking changes**: Revert and fix on feature branch
3. **Production issues**: Disable feature flag immediately
4. **Questions**: Review this document or check plan details

Remember: **When in doubt, keep the feature flag disabled.**

