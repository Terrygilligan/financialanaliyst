# Environment Variables Setup Guide

## Current Status

✅ **Gemini API Key**: Already configured in `functions/.env`

## Step-by-Step Setup

### 1. Your `.env` File Location
The `.env` file should be located at: `functions/.env`

### 2. Current `.env` File Structure

Your `.env` file should contain:

```env
# Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash

# Preferences
BASE_CURRENCY=GBP
ENABLE_REVIEW_WORKFLOW=true
```

### 3. Adding the Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Copy the key
4. Add it to `.env`: `GEMINI_API_KEY=your-api-key-here`

## Security Checklist

- ✅ `.env` file is in `.gitignore` (will not be committed)
- ⚠️ **NEVER** commit the `.env` file to Git
- ⚠️ **NEVER** share your API keys publicly

## How the Code Uses These Variables

### In `functions/src/gemini.ts`:
```typescript
const apiKey = process.env.GEMINI_API_KEY; // Reads from .env
```

## Deployment

When you deploy with `firebase deploy --only functions`, the environment variables from `.env` will be automatically loaded by the `dotenv` package (already configured in `functions/src/index.ts`).

For production, consider using Google Secret Manager for enhanced security.
