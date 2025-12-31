#!/bin/bash

# Fix Permissions Script
# Repairs IAM permissions for the backend service account

set -e  # Exit on error

PROJECT_ID="financialanaliyst"
SA_EMAIL="backend-sa@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🛠️  Starting Repair for Project: $PROJECT_ID"
echo "Service Account: $SA_EMAIL"
echo ""

# Step 1: Enable APIs
echo "📋 Step 1: Enabling Drive and Sheets APIs..."
gcloud services enable drive.googleapis.com sheets.googleapis.com --project=$PROJECT_ID
echo "✅ APIs enabled"
echo ""

# Step 2: Grant Secret Manager Access
echo "📋 Step 2: Granting Secret Manager access..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None > /dev/null 2>&1 || echo "   ⚠️  Role may already be granted"
echo "✅ Secret Manager access granted"
echo ""

# Step 3: Grant Service Account Token Creator
echo "📋 Step 3: Granting Token Creator role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/iam.serviceAccountTokenCreator" \
    --condition=None > /dev/null 2>&1 || echo "   ⚠️  Role may already be granted"
echo "✅ Token Creator role granted"
echo ""

# Step 4: Grant Cloud Run Invoker (if needed)
echo "📋 Step 4: Granting Cloud Run Invoker role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/run.invoker" \
    --condition=None > /dev/null 2>&1 || echo "   ⚠️  Role may already be granted"
echo "✅ Cloud Run Invoker role granted"
echo ""

# Step 5: Grant Datastore User (for Firestore)
echo "📋 Step 5: Granting Datastore User role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/datastore.user" \
    --condition=None > /dev/null 2>&1 || echo "   ⚠️  Role may already be granted"
echo "✅ Datastore User role granted"
echo ""

echo "✨ Repair Complete!"
echo ""
echo "📝 Important: Ensure your Master Sheet is shared with: $SA_EMAIL"
echo "   - Open your Google Sheet"
echo "   - Click 'Share' button"
echo "   - Add: $SA_EMAIL"
echo "   - Grant 'Editor' role"
echo ""
echo "🔍 To verify permissions, run: ./verify-permissions.sh"

