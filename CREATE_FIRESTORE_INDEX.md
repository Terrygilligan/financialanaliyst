# Create Firestore Index for Sheet Configs

## Why We Need This Index

The query `where('status', '==', 'active').orderBy('name')` requires a composite index.

## Quick Method: Use the Error Link

When you see the error in the console, it provides a direct link to create the index. Click it!

## Manual Method

1. **Go to Firebase Console**:
   - https://console.firebase.google.com/project/<YOUR_PROJECT_ID>/firestore/indexes

2. **Click "Create Index"**

3. **Configure the Index**:
   - **Collection ID**: `sheet_configs`
   - **Fields to index**:
     - Field: `status`, Order: `Ascending`
     - Field: `name`, Order: `Ascending`
   - **Query scope**: Collection

4. **Click "Create"**

5. **Wait for index to build** (usually 1-2 minutes)

## Alternative: Use the Direct Link

The error message in the console should provide a link like:
```
https://console.firebase.google.com/v1/r/project/<YOUR_PROJECT_ID>/firestore/indexes?create_composite=...
```

Click that link and it will pre-fill everything!

---

**Note**: The code works without the index (uses in-memory sorting), but the index improves performance and is recommended for production.


