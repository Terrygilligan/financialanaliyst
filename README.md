# AI Financial Analyst - Multi-Tenant SaaS Platform

A secure, siloed SaaS platform for automated financial analysis. This application automatically processes receipt images using AI and stores structured data in business-specific Firestore silos.

## 🏗️ Project Overview

The architecture ensures total data isolation between businesses (tenants) using **Identity Platform** and **Firestore subcollections**.

1.  **Identity Isolation**: Users are partitioned into Tenants. Every user has a `businessId` and `role` (admin, bookkeeper, driver) in their JWT.
2.  **Data Silos**: All business data is stored at `/businesses/{businessId}/receipts/...`.
3.  **Storage Isolation**: Files are stored at `/tenants/{businessId}/drivers/{uid}/receipts/...`.
4.  **AI Extraction**: Uses **Google Gemini 2.5 Flash** to extract data based on **Dynamic Schemas** defined by each business.
5.  **Tenant-Aware Recovery**: Password reset and login flows automatically detect the user's tenant context.

## 🚀 Key Features

*   **Siloed Multi-Tenancy**: Physical and logical data separation for maximum security.
*   **Dynamic Schemas (Field Builder)**: Admins can define custom fields (e.g., "Shift ID," "Odometer") that Gemini will automatically extract.
*   **Delegated User Management**: Business Admins can invite and manage their own "Drivers" within their silo.
*   **Tenant-Aware Auth**: Support for Email/Password and Google Login with automatic silo detection.
*   **Modern PWA**: Fully responsive, installable web application with offline-ready capabilities.

## ✅ What's Been Completed

### Phase 1: Multi-Tenant Architecture
- ✅ **Identity Layer**: Migrated to Identity Platform with `tenantId` support.
- ✅ **Custom Claims**: Automated injection of `businessId` into Auth tokens.
- ✅ **Security Rules**: Robust Firestore and Storage rules enforcing siloed access.
- ✅ **User Lookup**: Top-level mapping for unauthenticated tenant detection.

### Phase 2: AI & Extraction
- ✅ **Vertex AI Integration**: Multimodal processing with `gemini-2.5-flash`.
- ✅ **Dynamic Schema Engine**: Extraction prompt generated from business-specific fields.
- ✅ **Normalization**: Automated validation and category normalization.

### Phase 3: Enterprise Management
- ✅ **Admin Dashboard**: Multi-tenant aware control panel for statistics and oversight.
- ✅ **Field Builder**: UI for admins to manage their own data structures.
- ✅ **User Management**: Delegated invitation flow for adding drivers to silos.
- ✅ **Account Recovery**: Fully tenant-aware password reset workflow.

### Phase 4: Modernization & Cleanup
- ✅ **Sheets Deprecation**: Removed all legacy Google Sheets and Drive API logic.
- ✅ **Code Quality**: Mass sanitization of identifiers and implementation of `AGENTS.md` rules.
- ✅ **Builder.io**: Initial integration of CLI for visual UI management.

## 📁 Repository Structure

*   `/public`: Frontend (Vanilla JS, HTML5, CSS3). Multi-tenant aware UI logic.
*   `/functions/src`: Backend (Node.js, TypeScript). Core processing and administration logic.
*   `/firestore.rules`: Security rules enforcing `businessId` isolation.
*   `/storage.rules`: Security rules enforcing `tenants/{businessId}` isolation.
*   `AGENTS.md`: "Golden Rules" for AI-assisted development.

## 🔧 Configuration

### Environment Variables (`functions/.env`)

*   `BASE_CURRENCY`: Default currency for extraction (e.g., GBP).
*   `ENABLE_REVIEW_WORKFLOW`: Feature flag for human-in-the-loop validation.

### 🤖 Interaction Guidelines (`AGENTS.md`)

This project follows strict **Data Isolation** rules. Refer to `AGENTS.md` before making any architectural changes to ensure tenant boundaries are respected.

## 🛠️ Development & Deployment

### Build
```bash
cd functions
npm run build
```

### Local Testing (Emulators)
```bash
firebase emulators:start
```

### Deploy
```bash
firebase deploy
```

## 🌐 Project Info

*   **Project ID**: `<YOUR_PROJECT_ID>`
*   **Region**: `us-central1`
*   **Hosting URL**: `https://<YOUR_PROJECT_ID>.web.app`

---

**Last Updated**: December 31, 2025 - Multi-tenant SaaS migration complete. Enterprise features (Dynamic Schemas, Delegated Auth) fully implemented and deployed.
