# API Key Guide - Which Key to Use

## Your Current Situation

You have **2 API keys**, both are "Browser key (auto created by Firebase)" with 24 API restrictions.

## Understanding the Keys

### Browser Keys (What You Have)
- Created automatically by Firebase
- Typically restricted to Firebase services
- Used for frontend (web app)
- May not include Generative Language API

### Server Keys (What You Need for Cloud Functions)
- Should be created separately for backend use
- Can be unrestricted or have specific API restrictions
- Used in Cloud Functions for calling external APIs

## Solution: Create a New Server API Key

Since your browser keys are restricted and may not include Generative Language API, create a dedicated server key:

### Step 1: Create New API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** → **Credentials**
3. Click **+ CREATE CREDENTIALS** → **API key**
4. Copy the new key immediately (you'll see it once)

### Step 2: Configure the New Key
1. Click on the newly created key to edit it
2. **Name**: Give it a name like "Gemini API Key for Cloud Functions"
3. **API restrictions**: Choose one:
   - **Option A (Recommended)**: Select "Restrict key" → Choose "Generative Language API" only
   - **Option B (Testing)**: Select "Don't restrict key" (less secure but easier for testing)
4. **Application restrictions**: Select "None" (for server-side use)
5. Click **Save**

### Step 3: Update Your .env File
1. Open `functions/.env`
2. Replace the `GEMINI_API_KEY` value with your new key:
   ```
   GEMINI_API_KEY=your-new-server-api-key-here
   ```

### Step 4: Redeploy Function
```bash
cd functions
firebase deploy --only functions --project financialanaliyst
```

## Alternative: Edit Existing Browser Key

If you want to use one of your existing keys:

1. Click on one of the browser keys (the newer one from Dec 14)
2. Under **API restrictions**, click to edit
3. Make sure **"Generative Language API"** is in the allowed APIs list
4. If it's not there, add it
5. Click **Save**
6. Use that key in your `functions/.env` file

## Which Key is Currently Being Used?

Check your `functions/.env` file - it should have:
```
GEMINI_API_KEY=AIzaSy...
```

Compare this with your two keys to see which one is configured.

## Recommendation

**Create a new server API key** specifically for Cloud Functions:
- More secure (can be restricted to just Generative Language API)
- Separate from frontend keys
- Better for production use
- Easier to manage

---

**Next Step**: Create a new server API key and update your `.env` file
