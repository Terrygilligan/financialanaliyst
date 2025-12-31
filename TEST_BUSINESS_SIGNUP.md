# Test Business Signup - Manual Instructions

## ✅ Emulators Status

The Firebase emulators should be running. Check by opening:

**Main App**: http://localhost:5000  
**Business Signup**: http://localhost:5000/business-signup.html

---

## 🧪 Testing Steps

### 1. Open Business Signup Page

Open in your browser:
```
http://localhost:5000/business-signup.html
```

### 2. Enter Business Name

- Type a business name (e.g., "Test Business")
- Make sure the field is filled

### 3. Click Google Sign-In

- Click "Sign in with Google (Required)" button
- Google popup should appear

### 4. Sign In with Google

- Use the email you added as a test user
- Grant Drive and Sheets permissions
- Click "Allow"

### 5. Watch for Success

You should see:
- ✅ "Creating your Google Drive folder..." message
- ✅ "Setting up your Google Sheet..." message
- ✅ Success message: "Business created successfully!"
- ✅ Option to open Google Sheet
- ✅ Redirect to main app

---

## 🐛 If You See Errors

### Error: 403 Access Denied
- **Fix**: Make sure your email is in test users list
- **URL**: https://console.cloud.google.com/apis/credentials/consent?project=<YOUR_PROJECT_ID>

### Error: Function not found
- **Fix**: Make sure emulators are running
- **Check**: http://localhost:4000 (emulator UI)

### Error: Network error
- **Fix**: Check emulator logs in terminal
- **Restart**: Stop and restart emulators

---

## 📋 Checklist

- [ ] Emulators running (check http://localhost:4000)
- [ ] Business signup page loads
- [ ] Can enter business name
- [ ] Google Sign-In button works
- [ ] OAuth popup appears
- [ ] Can grant permissions
- [ ] Business provisioning starts
- [ ] Success message appears

---

## 🔍 Check Emulator Logs

Look in your terminal for:
- `[Business Provisioning] Starting provisioning...`
- `[Business Provisioning] ✅ Folder created`
- `[Business Provisioning] ✅ Sheet created`
- `[Business Provisioning] ✅ Business provisioning complete`

---

**Status**: Ready to test manually in your browser

