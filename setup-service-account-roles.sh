#!/bin/bash

# Setup Service Account Roles Script
# Creates the service account (if needed) and grants necessary IAM roles

PROJECT_ID="<YOUR_PROJECT_ID>"
SERVICE_ACCOUNT_NAME="backend-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Setting up service account and IAM roles"
echo "Project: $PROJECT_ID"
echo "Service Account: $SERVICE_ACCOUNT_EMAIL"
echo ""

# Set the active project
echo "Setting active project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

if [ $? -ne 0 ]; then
    echo "Error: Failed to set project"
    exit 1
fi

# Check if service account exists
echo ""
echo "Checking if service account exists..."
gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "Service account does not exist. Creating it..."
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="Backend Service Account" \
        --description="Service account for backend services and API Gateway" \
        --project=$PROJECT_ID
    
    if [ $? -eq 0 ]; then
        echo "✅ Service account created successfully"
    else
        echo "❌ Error: Failed to create service account"
        exit 1
    fi
else
    echo "✅ Service account already exists"
fi

# Grant Secret Manager Secret Accessor role
echo ""
echo "Granting roles/secretmanager.secretAccessor role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/secretmanager.secretAccessor"

if [ $? -eq 0 ]; then
    echo "✅ Successfully granted roles/secretmanager.secretAccessor"
else
    echo "❌ Error: Failed to grant roles/secretmanager.secretAccessor"
    exit 1
fi

# Grant Cloud Run Invoker role
echo ""
echo "Granting roles/run.invoker role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/run.invoker"

if [ $? -eq 0 ]; then
    echo "✅ Successfully granted roles/run.invoker"
else
    echo "❌ Error: Failed to grant roles/run.invoker"
    exit 1
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Service account: $SERVICE_ACCOUNT_EMAIL"
echo "Roles granted:"
echo "  - roles/secretmanager.secretAccessor"
echo "  - roles/run.invoker"
echo ""
echo "To verify, run:"
echo "  gcloud projects get-iam-policy $PROJECT_ID --flatten='bindings[].members' --filter='bindings.members:serviceAccount:$SERVICE_ACCOUNT_EMAIL'"
