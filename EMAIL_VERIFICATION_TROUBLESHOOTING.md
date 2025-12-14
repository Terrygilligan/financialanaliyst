# Email Verification Troubleshooting

## Common Issues

### 1. Email Not Being Sent

**Possible Causes:**
- Email templates not configured in Firebase
- Email going to spam folder
- Firebase Authentication email service not enabled
- Network/firewall blocking emails

**Solutions:**

#### Check Firebase Authentication Settings:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **financialanaliyst**
3. Go to **Authentication** → **Templates** tab
4. Check if **Email address verification** template exists
5. If not, it should be created automatically, but you can customize it

#### Check Email Action URL:
1. In Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Make sure `localhost` is added (for local testing)
3. For production, add your domain

#### Check Spam Folder:
- Verification emails often go to spam initially
- Check your spam/junk folder
- Mark as "Not Spam" if found

### 2. Error Messages

**"auth/too-many-requests"**
- Too many verification emails sent
- Wait a few minutes and try again

**"auth/network-request-failed"**
- Network connectivity issue
- Check internet connection

**"auth/invalid-action-code"**
- Verification link expired or invalid
- Request a new verification email

### 3. Testing Email Verification

**Manual Test:**
1. Sign up with a test email
2. Check browser console (F12) for any errors
3. Check email inbox (and spam)
4. Click verification link
5. Try logging in

**Check Console Logs:**
- Open browser console (F12)
- Look for:
  - "User created: [email]"
  - "Verification email sent successfully"
  - Any error messages

### 4. Firebase Console Configuration

**Enable Email Verification:**
1. Firebase Console → **Authentication** → **Sign-in method**
2. Click on **Email/Password**
3. Make sure it's **Enabled**
4. Check **Email link (passwordless sign-in)** if you want that option

**Configure Email Templates:**
1. Firebase Console → **Authentication** → **Templates**
2. Click **Email address verification**
3. Customize the email template if needed
4. Make sure **Action URL** is set correctly

### 5. Code Debugging

**Add Console Logging:**
The code now includes console.log statements to help debug:
- Check browser console for:
  - User creation success
  - Email sending success/failure
  - Any errors

**Check Network Tab:**
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try signing up
4. Look for API calls to Firebase
5. Check for any failed requests

### 6. Production vs Local

**Local Development:**
- Emails should work on localhost
- Make sure `localhost` is in authorized domains

**Production:**
- Add your domain to authorized domains
- Update email templates with production URLs
- Check Firebase quotas/limits

## Quick Fixes

1. **Resend Verification Email:**
   - Use the "Resend verification email" button on login page
   - Or sign in and use the resend option

2. **Check Firebase Quotas:**
   - Firebase has daily email limits
   - Check if you've exceeded limits

3. **Verify Email Template:**
   - Make sure email template is active
   - Check action URL is correct

4. **Test with Different Email:**
   - Try with a different email provider
   - Some email providers block automated emails

---

**Status**: Code updated with better error handling and logging
