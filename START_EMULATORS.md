# Start Firebase Emulators - Manual Instructions

## Quick Start Command

Open a terminal in the project directory and run:

```bash
cd c:\Users\terry\Desktop\<YOUR_PROJECT_ID>
firebase emulators:start
```

## Expected Output

You should see:
```
✔  All emulators ready! It is now safe to connect.
✔  Emulator UI started at http://localhost:4000
✔  Hosting emulator started at http://localhost:5000
✔  Functions emulator started at http://localhost:5001
```

## Access URLs

- **Main App**: http://localhost:5000
- **Business Signup**: http://localhost:5000/business-signup.html
- **Emulator UI**: http://localhost:4000

## If Emulators Don't Start

1. **Check for port conflicts**:
   ```bash
   netstat -ano | findstr ":5000 :4000 :5001"
   ```

2. **Kill existing processes**:
   ```bash
   # Find process using port 5000
   netstat -ano | findstr :5000
   # Kill it (replace PID with actual process ID)
   taskkill /F /PID <PID>
   ```

3. **Restart emulators**:
   ```bash
   firebase emulators:start
   ```

## Troubleshooting

- **"No emulators to start"**: Run `firebase init emulators`
- **Port already in use**: Kill the process using that port
- **Connection refused**: Wait 10-15 seconds for emulators to fully start

---

**Status**: Run `firebase emulators:start` in your terminal
