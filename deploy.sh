#!/bin/bash

# Deployment Script for provisionNewBusiness Function
# Enables required APIs and deploys the function to Firebase

set -e  # Exit on error

PROJECT_ID="<YOUR_PROJECT_ID>"
# Deploy all business management functions
FUNCTION_NAMES="provisionNewBusiness getBusinessDetails updateBusinessSettings addAuthorizedUser"

echo "🚀 Deploying business management functions to project: $PROJECT_ID"
echo "Functions: $FUNCTION_NAMES"
echo ""

# Step 1: Set the active project
echo "📋 Step 1: Setting active project..."
gcloud config set project $PROJECT_ID
echo "✅ Project set to: $PROJECT_ID"
echo ""

# Step 2: Enable required APIs
echo "📋 Step 2: Enabling required APIs..."
gcloud services enable \
    cloudfunctions.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    run.googleapis.com \
    eventarc.googleapis.com \
    pubsub.googleapis.com \
    storage.googleapis.com \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ APIs enabled successfully"
else
    echo "⚠️  Some APIs may already be enabled or there was an error"
fi
echo ""

# Step 3: Build the functions
echo "📋 Step 3: Building functions..."
cd functions
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ Build successful"
cd ..
echo ""

# Step 4: Deploy all business management functions
echo "📋 Step 4: Deploying business management functions..."
firebase deploy --only functions:provisionNewBusiness,functions:getBusinessDetails,functions:updateBusinessSettings,functions:addAuthorizedUser --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All business management functions deployed successfully!"
    echo ""
    echo "✨ Deployment complete!"
    echo ""
    echo "📝 Next steps:"
    echo "   - View all function logs: firebase functions:log --project=$PROJECT_ID"
    echo "   - Test business signup: Visit business-signup.html"
    echo "   - Monitor specific function: firebase functions:log --only provisionNewBusiness --project=$PROJECT_ID"
    echo ""
else
echo ""
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
