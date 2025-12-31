# Firebase Hosting Setup Guide

## ✅ What's Been Set Up

1. ✅ Firebase Hosting configuration added to `firebase.json`
2. ✅ `public/` directory created with frontend files
3. ✅ Basic PWA structure created:
   - `index.html` - Main application page
   - `styles.css` - Styling
   - `app.js` - Application logic
   - `manifest.json` - PWA manifest
   - `firebase-config.js` - Firebase configuration template

## 🔧 Next Steps: Configure Firebase

### Step 1: Get Your Firebase Web App Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **<YOUR_PROJECT_ID>**
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll down to **Your apps** section
5. If you don't have a web app yet:
   - Click **Add app** → Select **Web** (</> icon)
   - Register your app (nickname: "Financial Analyst Web")
   - Copy the configuration values

### Step 2: Update Firebase Configuration

Edit `public/firebase-config.js` and replace the placeholder values:

```javascript
export const firebaseConfig = {
    apiKey: "AIza...",  // Your actual API key
    authDomain: "<YOUR_PROJECT_ID>.firebaseapp.com",
    projectId: "<YOUR_PROJECT_ID>",
    storageBucket: "<YOUR_PROJECT_ID>.firebasestorage.app",
    messagingSenderId: "123456789",  // Your actual sender ID
    appId: "1:123456789:web:abc123"  // Your actual app ID
};
```

### Step 3: Enable Firebase Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** sign-in method
4. (Optional) Enable **Google** sign-in if desired

### Step 4: Configure Storage Security Rules

1. Go to **Storage** in Firebase Console
2. Click **Rules** tab
3. Update rules to allow authenticated uploads:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /receipts/{userId}/{fileName} {
      // Only authenticated users can upload
      allow write: if request.auth != null && request.auth.uid == userId;
      // Users can only read their own files
      allow read: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Step 5: Configure Firestore Security Rules

1. Go to **Firestore Database** in Firebase Console
2. Click **Rules** tab
3. Update rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /batches/{userId} {
      // Users can only read/write their own batch documents
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🚀 Deploy to Firebase Hosting

Once configuration is complete:

```bash
firebase deploy --only hosting --project <YOUR_PROJECT_ID>
```

Or deploy everything (functions + hosting):

```bash
firebase deploy --project <YOUR_PROJECT_ID>
```

## 📝 Testing Locally

You can test the hosting locally before deploying:

```bash
firebase serve --only hosting --project <YOUR_PROJECT_ID>
```

Then open: `http://localhost:5000`

## 🎨 Frontend Features

The frontend includes:

- ✅ **Authentication**: Login/Signup with email/password
- ✅ **File Upload**: Drag-and-drop or click to upload receipts
- ✅ **Progress Tracking**: Real-time upload progress
- ✅ **Status Monitoring**: Live updates from Firestore
- ✅ **Upload History**: View previous uploads
- ✅ **Responsive Design**: Works on mobile and desktop
- ✅ **PWA Ready**: Can be installed as an app

## ⚠️ Important Notes

1. **Firebase Config**: Must update `firebase-config.js` with your actual values
2. **Authentication**: Must enable Email/Password in Firebase Console
3. **Security Rules**: Must configure Storage and Firestore rules
4. **Icons**: Add app icons (`icon-192.png`, `icon-512.png`) to `public/` for full PWA support

## 🔗 URLs After Deployment

After deploying, your app will be available at:
- **Production**: `https://<YOUR_PROJECT_ID>.web.app`
- **Alternative**: `https://<YOUR_PROJECT_ID>.firebaseapp.com`

---

**Status**: Frontend structure ready, awaiting Firebase configuration
