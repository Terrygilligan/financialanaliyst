# Fix OAuth 403 Error - Access Denied

## Problem
You're getting: "The developer hasn't given you access to this app. It's currently being tested"

## Solution: Add Test Users

Since your app is in "Testing" mode, you need to add your email as a test user.

### Step 1: Go to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: **financialanaliyst**
3. Navigate to: **APIs & Services** → **OAuth consent screen**

### Step 2: Add Test Users

1. Scroll down to **"Test users"** section
2. Click **"+ ADD USERS"**
3. Add your email address (the one you're trying to sign in with)
4. Click **"ADD"**

### Step 3: Try Again

1. Go back to the business signup page
2. Click "Sign in with Google" again
3. You should now be able to sign in

---

## Alternative: Change to Internal (Google Workspace Only)

If you're using Google Workspace and want all users in your domain to access:

1. Go to **OAuth consent screen**
2. Change **User Type** from "External" to "Internal"
3. This allows all users in your Google Workspace domain

**Note**: This only works if you have Google Workspace. Personal Gmail accounts must use "External" with test users.

---

## For Production: Publish App

To allow anyone to sign in (production):

1. Go to **OAuth consent screen**
2. Click **"PUBLISH APP"**
3. Complete verification process (required for sensitive scopes like Drive)

**Warning**: Publishing requires Google verification, which can take time. For testing, use test users instead.

---

## Quick Fix (Recommended for Testing)

1. **Add your email as test user** (fastest solution)
2. Try signing in again
3. Should work immediately

---

**Status**: Add your email to test users list in Google Cloud Console

