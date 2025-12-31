#!/bin/bash

# Verify Permissions Script
# Checks if service account has correct permissions and can access resources

PROJECT_ID="<YOUR_PROJECT_ID>"
SA_EMAIL="backend-sa@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🔍 Verifying permissions for: $SA_EMAIL"
echo "Project: $PROJECT_ID"
echo ""

# Check 1: Verify service account exists
echo "📋 Check 1: Verifying service account exists..."
if gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID > /dev/null 2>&1; then
    echo "✅ Service account exists"
else
    echo "❌ Service account NOT found: $SA_EMAIL"
    echo "   Run: ./setup-cloud.sh to create it"
    exit 1
fi
echo ""

# Check 2: Verify APIs are enabled
echo "📋 Check 2: Verifying APIs are enabled..."
APIS=("drive.googleapis.com" "sheets.googleapis.com")
for API in "${APIS[@]}"; do
    if gcloud services list --enabled --project=$PROJECT_ID --filter="name:$API" --format="value(name)" | grep -q "$API"; then
        echo "✅ $API is enabled"
    else
        echo "❌ $API is NOT enabled"
        echo "   Run: gcloud services enable $API --project=$PROJECT_ID"
    fi
done
echo ""

# Check 3: Verify IAM roles
echo "📋 Check 3: Verifying IAM roles..."
ROLES=(
    "roles/secretmanager.secretAccessor"
    "roles/iam.serviceAccountTokenCreator"
    "roles/run.invoker"
    "roles/datastore.user"
)

for ROLE in "${ROLES[@]}"; do
    if gcloud projects get-iam-policy $PROJECT_ID \
        --flatten="bindings[].members" \
        --filter="bindings.members:serviceAccount:$SA_EMAIL AND bindings.role:$ROLE" \
        --format="value(bindings.role)" | grep -q "$ROLE"; then
        echo "✅ $ROLE granted"
    else
        echo "❌ $ROLE NOT granted"
        echo "   Run: ./fix-permissions.sh to fix"
    fi
done
echo ""

# Check 4: Verify service account key exists
echo "📋 Check 4: Verifying service account key file..."
KEY_FILE="./functions/service-account-key.json"
if [ -f "$KEY_FILE" ]; then
    echo "✅ Key file exists: $KEY_FILE"
    
    # Verify key file is valid JSON
    if jq empty "$KEY_FILE" 2>/dev/null; then
        echo "✅ Key file is valid JSON"
        
        # Check project_id matches
        KEY_PROJECT=$(jq -r '.project_id' "$KEY_FILE")
        if [ "$KEY_PROJECT" == "$PROJECT_ID" ]; then
            echo "✅ Key file project_id matches: $PROJECT_ID"
        else
            echo "⚠️  Key file project_id mismatch: $KEY_PROJECT (expected: $PROJECT_ID)"
        fi
    else
        echo "❌ Key file is NOT valid JSON"
    fi
else
    echo "⚠️  Key file NOT found: $KEY_FILE"
    echo "   Run: gcloud iam service-accounts keys create $KEY_FILE --iam-account=$SA_EMAIL"
fi
echo ""

# Check 5: Test Drive API access (if template ID provided)
if [ -n "$1" ]; then
    TEMPLATE_ID="$1"
    echo "📋 Check 5: Testing Drive API access to template..."
    echo "   Template ID: $TEMPLATE_ID"
    
    if gcloud drive files describe "$TEMPLATE_ID" \
        --impersonate-service-account="$SA_EMAIL" \
        --project=$PROJECT_ID > /dev/null 2>&1; then
        echo "✅ Service account can access template"
    else
        echo "❌ Service account CANNOT access template"
        echo "   Make sure the sheet is shared with: $SA_EMAIL"
        echo "   Grant 'Editor' role in Google Sheets"
    fi
else
    echo "📋 Check 5: Skipping Drive API test (no template ID provided)"
    echo "   To test: ./verify-permissions.sh [TEMPLATE_ID]"
fi
echo ""

echo "✨ Verification complete!"
echo ""
echo "💡 Tips:"
echo "   - If any checks failed, run: ./fix-permissions.sh"
echo "   - To test Drive access: ./verify-permissions.sh [YOUR_SHEET_ID]"
echo "   - To clear emulator data: curl -X DELETE http://localhost:8080/emulator/v1/projects/$PROJECT_ID/databases/(default)/documents"

