#!/bin/bash

# Setup Cloud Environment Script
# Sets up GCP project, service accounts, APIs, and permissions for <YOUR_PROJECT_ID>

set -e  # Exit on error

PROJECT_ID="<YOUR_PROJECT_ID>"
SERVICE_ACCOUNT_NAME="backend-provisioner"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🚀 Setting up cloud environment for: $PROJECT_ID"
echo ""

# Step 1: Set the active project
echo "📋 Step 1: Setting active project..."
gcloud config set project $PROJECT_ID
echo "✅ Project set to: $PROJECT_ID"
echo ""

# Step 2: Enable required APIs
echo "📋 Step 2: Enabling required APIs..."
gcloud services enable \
    drive.googleapis.com \
    sheets.googleapis.com \
    firestore.googleapis.com \
    cloudfunctions.googleapis.com \
    secretmanager.googleapis.com \
    iam.googleapis.com \
    --project=$PROJECT_ID
echo "✅ APIs enabled"
echo ""

# Step 3: Create service account (if it doesn't exist)
echo "📋 Step 3: Creating service account..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID > /dev/null 2>&1; then
    echo "⚠️  Service account already exists: $SERVICE_ACCOUNT_EMAIL"
else
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="Backend Provisioner Service Account" \
        --description="Service account for business provisioning and Google Drive/Sheets operations" \
        --project=$PROJECT_ID
    echo "✅ Service account created: $SERVICE_ACCOUNT_EMAIL"
fi
echo ""

# Step 4: Grant IAM roles
echo "📋 Step 4: Granting IAM roles..."

ROLES=(
    "roles/datastore.user"
    "roles/secretmanager.secretAccessor"
    "roles/iam.serviceAccountTokenCreator"
    "roles/run.invoker"
)

for ROLE in "${ROLES[@]}"; do
    echo "   Granting $ROLE..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$ROLE" \
        --condition=None > /dev/null 2>&1 || echo "   ⚠️  Role may already be granted"
done
echo "✅ IAM roles granted"
echo ""

# Step 5: Create service account key
echo "📋 Step 5: Creating service account key..."
KEY_FILE="./functions/service-account-key.json"
if [ -f "$KEY_FILE" ]; then
    echo "⚠️  Key file already exists: $KEY_FILE"
    read -p "   Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Skipping key creation..."
    else
        gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$SERVICE_ACCOUNT_EMAIL \
            --project=$PROJECT_ID
        echo "✅ Service account key created: $KEY_FILE"
    fi
else
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SERVICE_ACCOUNT_EMAIL \
        --project=$PROJECT_ID
    echo "✅ Service account key created: $KEY_FILE"
fi
echo ""

# Step 6: Set permissions on key file
chmod 600 $KEY_FILE
echo "✅ Key file permissions set (600)"
echo ""

echo "✨ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Share your Google Sheet template with: $SERVICE_ACCOUNT_EMAIL"
echo "   2. Set environment variable: export GOOGLE_APPLICATION_CREDENTIALS=\"$KEY_FILE\""
echo "   3. Or add to functions/.env: GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY=\$(cat $KEY_FILE | jq -c)"
echo ""
echo "🔍 To verify setup, run: ./verify-setup.sh"

