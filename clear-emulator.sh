#!/bin/bash

# Clear Emulator Data Script
# Clears Firestore data from the running emulator

PROJECT_ID="financialanaliyst"
EMULATOR_PORT="${1:-8080}"  # Default to 8080, or use first argument
BASE_URL="http://localhost:${EMULATOR_PORT}/emulator/v1/projects/${PROJECT_ID}/databases/(default)"

echo "🧹 Clearing Firestore emulator data..."
echo "Project: $PROJECT_ID"
echo "Emulator: localhost:$EMULATOR_PORT"
echo ""

# Option 1: Clear specific collection
if [ -n "$2" ]; then
    COLLECTION="$2"
    echo "Clearing collection: $COLLECTION"
    curl -v -X DELETE "${BASE_URL}/documents/${COLLECTION}"
    echo ""
    echo "✅ Collection '$COLLECTION' cleared"
else
    # Option 2: Clear all data
    echo "⚠️  This will delete ALL data in the emulator!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        curl -v -X DELETE "${BASE_URL}/documents"
        echo ""
        echo "✅ All emulator data cleared"
    else
        echo "❌ Cancelled"
        exit 1
    fi
fi

echo ""
echo "💡 Usage:"
echo "   Clear all data: ./clear-emulator.sh"
echo "   Clear collection: ./clear-emulator.sh [PORT] [COLLECTION_NAME]"
echo "   Example: ./clear-emulator.sh 8080 businesses"

