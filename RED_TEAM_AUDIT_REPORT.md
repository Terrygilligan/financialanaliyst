# Red Team Audit Report

## 🚨 CRITICAL FINDINGS

### 1. Security Hole: Missing & Permissive Firestore Rules
*   **Issue**: The `firestore.rules` file is **missing** from the repository root and `functions/` directory.
*   **Deviation**: The architecture requires "Strict data isolation via Identity Platform & Custom Claims (businessId)".
*   **Risk**: If deployed, Firestore might default to closed (breaking app) or open (public access). The documented rules in `FIRESTORE_RULES_UPDATED.md` **fail to enforce tenant isolation**. They only check `request.auth.uid == userId`, ignoring `request.auth.token.businessId`. This allows any authenticated user to potentially access data if they guess paths, violating the multi-tenant isolation requirement.
*   **Recommendation**: Create `firestore.rules` immediately and implement `match /businesses/{businessId}/...` rules checking `request.auth.token.businessId == businessId`.

### 2. Memory Risk: Unsafe File Download
*   **Location**: `functions/src/index.ts` (Line ~58)
*   **Issue**: `const [fileBuffer] = await bucket.file(filePath).download();`
*   **Risk**: This loads the **entire file** into memory (RAM) before any size validation (which happens later in `processor.ts`).
*   **Impact**: A malicious or accidental upload of a large file (e.g., 2GB video) will cause the Cloud Function to crash with an Out-Of-Memory (OOM) error, potentially leading to denial of service or cold-start storms.
*   **Recommendation**: Use `file.getMetadata()` to check `size` *before* downloading, or use a readable stream to process the file in chunks (though Gemini API might need a buffer, validation must happen first).

### 3. Reliability: Non-Idempotent Triggers
*   **Location**: `functions/src/index.ts` (`analyzeReceiptUpload`)
*   **Issue**: The function triggers on `onObjectFinalized`. If the event is delivered twice (standard Cloud behavior is "at least once"), the function runs twice.
*   **Impact**: `totalReceipts` and `totalAmount` in Firestore (`/users/{userId}`) are incremented blindly: `(currentStats.totalReceipts || 0) + 1`. Double execution results in **double-billing/double-counting** of data.
*   **Recommendation**: Implement idempotency checks using `eventId` or check if the file was already processed (e.g., store a hash of the file or check a `processed_files` collection).

---

## ⚠️ WARNINGS

### 1. Silent Failures & Weak Error Handling
*   **Location**: `functions/src/index.ts`
*   **Issue**:
    *   `setAdminClaim` swallows errors when checking admin status: `console.error("Error checking caller admin status:", error);`.
    *   `analyzeReceiptUpload`: `sheetsError` is logged, but the batch is marked as `complete` (with `sheetsWriteSuccess: false`). This is a partial failure state that might confuse users.
*   **Recommendation**: Ensure critical checks (like admin auth) throw errors to stop execution. Improve status reporting for partial failures.

### 2. Hardcoded Secrets (Env Vars)
*   **Location**: `functions/src/sheets.ts`
*   **Issue**: Reads `process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY` (potentially a full JSON string).
*   **Risk**: While better than hardcoding in code, large secrets in standard env vars can be leaked in logs or UI.
*   **Recommendation**: Use Google Cloud Secret Manager and `defineSecret` in Firebase Functions for sensitive keys.

### 3. Missing Idempotency in Sheets Appends
*   **Issue**: Appending to Google Sheets is not idempotent. Retry of the function will add a duplicate row.

---

## ✅ CLEARED ITEMS

*   **Vertex AI Auth**: `functions/src/gemini.ts` correctly uses `VertexAI` with Application Default Credentials (Service Account). No hardcoded API keys found for Vertex.
*   **Node.js Runtime**: `functions/package.json` specifies `"engines": { "node": "20" }`, matching the requirement.
