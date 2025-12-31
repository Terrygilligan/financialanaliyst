#!/bin/bash

# Setup New Google Cloud Project Script
# Creates a new GCP project with the correct name and enables necessary APIs

PROJECT_ID="<YOUR_PROJECT_ID>"
PROJECT_NAME="AI Financial Analyst"
BILLING_ACCOUNT_ID=""

echo "🚀 Setting up new Google Cloud project: $PROJECT_ID"
echo ""

# Step 1: List billing accounts
echo "📋 Step 1: Listing available billing accounts..."
echo ""
gcloud billing accounts list
echo ""
echo "Please note the BILLING_ACCOUNT_ID from the list above."
read -p "Enter your billing account ID: " BILLING_ACCOUNT_ID

if [ -z "$BILLING_ACCOUNT_ID" ]; then
    echo "❌ Error: Billing account ID is required"
    exit 1
fi

# Step 2: Create the new project
echo ""
echo "📦 Step 2: Creating new project '$PROJECT_ID'..."
gcloud projects create $PROJECT_ID --name="$PROJECT_NAME"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to create project. It may already exist."
    echo "   To check existing projects: gcloud projects list"
    exit 1
fi

echo "✅ Project created successfully!"

# Step 3: Set the project as active
echo ""
echo "🔧 Step 3: Setting project as active..."
gcloud config set project $PROJECT_ID
echo "✅ Project set as active"

# Step 4: Link billing account
echo ""
echo "💳 Step 4: Linking billing account..."
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT_ID

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to link billing account"
    exit 1
fi

echo "✅ Billing account linked successfully!"

# Step 5: Enable required APIs
echo ""
echo "🔌 Step 5: Enabling required APIs..."

APIS=(
    "iam.googleapis.com"
    "firestore.googleapis.com"
    "sheets.googleapis.com"
    "drive.googleapis.com"
    "cloudfunctions.googleapis.com"
    "storage-component.googleapis.com"
    "firebase.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "aiplatform.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo "   Enabling $api..."
    gcloud services enable $api --project=$PROJECT_ID
    if [ $? -eq 0 ]; then
        echo "   ✅ $api enabled"
    else
        echo "   ⚠️  Warning: Failed to enable $api"
    fi
done

echo ""
echo "✨ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Create a Firebase project linked to this GCP project"
echo "   2. Create a service account for Google Sheets/Drive access"
echo "   3. Update your Firebase project ID in .firebaserc"
echo "   4. Update environment variables with new service account credentials"
echo ""
echo "Current active project: $PROJECT_ID"
echo "To verify: gcloud config get-value project"

