# Fix: Google Button Showing Account Name Instead of Standard Button

## The Issue

Google Identity Services (GIS) automatically shows a personalized button with your account name when you're already signed in to Google in your browser. This is expected behavior - it shows "Sign in as [Your Name]" instead of the standard "Sign in with Google" button.

## What I Changed

1. **Disabled One Tap auto-select**: Added `auto_select: false` to prevent automatic account selection
2. **Disabled One Tap prompt**: Added `itp_support: false` to prevent the One Tap popup
3. **Added button type**: Added `type: 'standard'` to try to force standard button appearance

## Current Behavior

- If you're **signed in to Google**: Shows personalized button with your account
- If you're **not signed in**: Shows standard "Sign in with Google" button

## Options

### Option 1: Keep Current (Recommended)
The personalized button works fine - clicking it will sign you in. This is actually better UX for users who are already signed in.

### Option 2: Force Standard Button
If you want to always show the standard button, we can:
- Use the fallback button instead of GIS button
- Or sign out of Google (not practical)

### Option 3: Hide Personalized Button
We could hide the GIS button when personalized and show a custom button instead.

---

## Test It

1. **Refresh the page**: http://localhost:5000/business-signup.html
2. **Check the button**: Should now show standard button or personalized account
3. **Click it**: Should work either way

---

**Note**: The personalized button is actually fine - it's showing you're signed in and ready to proceed. But if you prefer the standard button, let me know and I can implement Option 2 or 3.

