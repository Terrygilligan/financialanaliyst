# SME Automation Upgrade - Plan Summary

**Master Plan**: [BRANCH_WORKFLOW.md](BRANCH_WORKFLOW.md)  
**Status**: 📝 Ready to Start  
**Timeline**: 7+ weeks (phased rollout)

---

## 📋 Overview

The **SME Automation Upgrade** is a comprehensive plan to add enterprise features for Small/Medium Enterprise compliance and automation. All features are implemented behind a feature flag (`ENABLE_REVIEW_WORKFLOW`) to ensure zero risk to production.

---

## 🎯 Phase Breakdown

### Phase 0: Setup & Security (Week 1)
**Status**: Can merge immediately  
**Risk**: Zero (no code changes to existing functionality)

**Features**:
- ✅ Enhanced `.gitignore` with secret patterns
- ✅ Pre-commit security validation script
- ✅ GitHub Actions security workflow
- ✅ Secret scanning configuration
- ✅ Documentation updates

**Branch**: `feature/phase-0-security`

---

### Phase 1: Foundation Features (Week 2)
**Status**: Safe to merge (all additive)  
**Risk**: Low (backward compatible)

#### 1.1: Entity Tracking
- Create `functions/src/entities.ts`
- Add optional `entity` field to ReceiptData schema
- Entity lookup in `analyzeReceiptUpload`
- Defaults to 'Unassigned' if no entity found
- **Branch**: `feature/phase-1-entities`

#### 1.2: Multi-Language Support
- Create `public/translations.js`
- Update all JS files to use translations
- Falls back to English if translation missing
- **Branch**: `feature/phase-1-translations`

#### 1.3: Archive Function
- Create `functions/src/archive.ts`
- Admin-only HTTP callable function
- Archive old data functionality
- **Branch**: `feature/phase-1-archive`

---

### Phase 2: Core Workflow (Week 3-4)
**Status**: Merge with feature flag disabled  
**Risk**: Medium (new workflow, but flag-protected)

#### 2.1: Feature Flag Infrastructure
- Add `ENABLE_REVIEW_WORKFLOW` environment variable
- Update `analyzeReceiptUpload` to support both workflows
- Default to existing workflow (flag = false)
- **Branch**: `feature/phase-2-feature-flag`

#### 2.2: Pending Receipts System
- Create `functions/src/finalize.ts`
- Add pending workflow to `analyzeReceiptUpload` (behind flag)
- Create `public/review.html` and `review.js` for user corrections
- Receipts stored in "pending" state until user approves
- **Branch**: `feature/phase-2-pending-receipts`

#### 2.3: Dynamic Category Management
- Create `functions/src/categories.ts` for CRUD operations
- Add `/categories` Firestore collection
- Update review UI to use dynamic categories
- Existing Category enum remains as fallback
- **Branch**: `feature/phase-2-categories`

#### 2.4: Currency Conversion
- Create `functions/src/currency.ts` with caching
- Add `/fx_cache` Firestore collection for rate storage
- Add `BASE_CURRENCY` environment variable
- Graceful error handling with admin alerts
- **Branch**: `feature/phase-2-currency`

#### 2.5: Validation System
- Create `functions/src/validation.ts` for VAT format checking
- Make category dropdown mandatory in review UI
- Add validation to `finalizeReceipt`
- Set status to `needs_admin_review` on validation failure
- **Branch**: `feature/phase-2-validation`

#### 2.6: Admin Review Interface
- Create `public/admin-review.html` and `admin-review.js`
- Display receipts needing admin review
- Allow admin override and corrections
- **Branch**: `feature/phase-2-admin-review`

---

### Phase 3: Compliance Features (Week 5)
**Status**: Merge with feature flag disabled  
**Risk**: Low (all fields optional, backward compatible)

#### 3.1: Enhanced VAT Extraction
- Update `functions/src/schema.ts` (add VAT fields - all optional)
- Update `functions/src/gemini.ts` (enhance prompt)
- Add `supplierVatNumber` and `vatBreakdown` fields
- **Branch**: `feature/phase-3-vat`

#### 3.2: Accountant CSV Tab
- Update `functions/src/sheets.ts` (add accountant tab function)
- Update `functions/src/finalize.ts` (write to both tabs)
- Create `Accountant_CSV_Ready` tab in Google Sheets
- Add retry logic and error handling
- **Branch**: `feature/phase-3-accountant-tab`

#### 3.3: Audit Trail & Error Logging
- Create `functions/src/error-logging.ts`
- Update all functions with error logging
- Add audit trail columns to Sheets
- Create `/error_logs` Firestore collection
- **Branch**: `feature/phase-3-audit`

---

## 🔧 Key Features

### Review Workflow
- Receipts go to "pending" state after AI extraction
- Users review and correct data before finalizing
- Mandatory category selection
- VAT ID validation
- Admin review for flagged receipts

### Multi-Currency Support
- Automatic currency conversion to base currency
- Exchange rate caching in Firestore
- Graceful fallback on conversion errors

### Compliance Features
- VAT number extraction and validation
- Separate accountant-ready CSV tab in Sheets
- Complete audit trail with error logging

### Enterprise Features
- Entity tracking (multi-entity support)
- Multi-language UI
- Dynamic category management
- Archive automation

---

## 🚦 Feature Flag Strategy

**Environment Variable**: `ENABLE_REVIEW_WORKFLOW`

### Development
```env
ENABLE_REVIEW_WORKFLOW=true
BASE_CURRENCY=GBP
```

### Production (Initial)
```env
ENABLE_REVIEW_WORKFLOW=false  # Start disabled
BASE_CURRENCY=GBP
```

### Gradual Enablement
1. **Week 1**: Flag disabled (old workflow)
2. **Week 2**: Enable for test users
3. **Week 3**: Enable globally

---

## 📅 Timeline

| Week | Phase | Status | Risk |
|------|-------|--------|------|
| 1 | Phase 0: Security | ✅ Can merge immediately | Zero |
| 2 | Phase 1: Foundation | ✅ Safe to merge | Low |
| 3-4 | Phase 2: Core Workflow | ⚠️ Merge with flag disabled | Medium |
| 5 | Phase 3: Compliance | ⚠️ Merge with flag disabled | Low |
| 6 | Testing & Gradual Enablement | 📝 Testing phase | - |
| 7+ | Full Production Rollout | 📝 Enable globally | - |

---

## 🔄 Branch Workflow

### Main Feature Branch
```
feature/sme-automation-upgrade
```

### Phase Branches
```
feature/phase-0-security
feature/phase-1-entities
feature/phase-1-translations
feature/phase-1-archive
feature/phase-2-feature-flag
feature/phase-2-pending-receipts
feature/phase-2-categories
feature/phase-2-currency
feature/phase-2-validation
feature/phase-2-admin-review
feature/phase-3-vat
feature/phase-3-accountant-tab
feature/phase-3-audit
```

### Quick Start Commands

```powershell
# Setup (first time)
.\scripts\git-workflow.ps1 -Action setup

# Create phase branch
.\scripts\git-workflow.ps1 -Action create-phase -Phase "0-security" -Description "Security hardening"

# Merge phase branch
.\scripts\git-workflow.ps1 -Action merge-phase -Phase "0-security" -CommitMessage "Phase 0: Security checks"
```

---

## ✅ Success Criteria

### Phase 1 Complete When:
- [ ] Entity tracking works
- [ ] Multi-language UI functional
- [ ] Archive function available to admins

### Phase 2 Complete When:
- [ ] Feature flag infrastructure in place
- [ ] Pending receipts workflow functional
- [ ] Users can review and correct receipts
- [ ] Currency conversion working
- [ ] Validation system operational
- [ ] Admin review interface available

### Phase 3 Complete When:
- [ ] VAT extraction enhanced
- [ ] Accountant CSV tab created and populated
- [ ] Audit trail and error logging functional

---

## 🛡️ Safety Measures

1. **Feature Flag**: All new workflow behind `ENABLE_REVIEW_WORKFLOW` flag
2. **Backward Compatible**: Existing workflow remains default
3. **Gradual Rollout**: Enable for test users first
4. **Rollback Ready**: Can disable flag instantly if issues
5. **No Breaking Changes**: All new fields are optional

---

## 📚 Related Documentation

- **[BRANCH_WORKFLOW.md](BRANCH_WORKFLOW.md)** - Complete detailed plan with all steps
- **[QUICK_START_BRANCHES.md](QUICK_START_BRANCHES.md)** - Quick reference guide
- **[scripts/README.md](scripts/README.md)** - Git workflow scripts
- **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Complete documentation index

---

## 🎯 Next Steps

1. **Review complete plan**: Read [BRANCH_WORKFLOW.md](BRANCH_WORKFLOW.md)
2. **Start Phase 0**: Security hardening (zero risk)
3. **Set up feature branch**: Use git workflow script
4. **Follow phase-by-phase**: Complete each phase before moving to next
5. **Test thoroughly**: Before enabling feature flag in production

---

**Last Updated**: 2024-12-19  
**Status**: 📝 Ready to Start  
**Master Plan**: [BRANCH_WORKFLOW.md](BRANCH_WORKFLOW.md)

