# Quick Diagnostic Script for Production Server

## Step 1: Check if backend is running
Run this on your production server (SSH: root@147.93.108.205):
```bash
pm2 list
pm2 logs backend --lines 50
```

Look for:
- `✅ Database initialization completed`
- `🚀 Server running on port 3001`

## Step 2: Test the homepage route locally on server
```bash
curl -A "Googlebot" http://localhost:3001/ | head -100
```

Should return HTML with products, NOT JSON error.

## Step 3: Check if dynamic rendering code exists
```bash
cd /root/IT/backend
grep -n "isBotRequest" api.js
grep -n "🤖 Bot detected" api.js
```

Should show line numbers where bot detection code exists.

## Step 4: Check the prerender route
```bash
cd /root/IT/backend
ls -la routes/prerenderRoutes.js
ls -la middleware/botDetection.js
```

Both files must exist.

## Step 5: Test the prerender endpoint directly
```bash
curl http://localhost:3001/api/prerender/homepage | head -100
```

Should return complete HTML with products.

## Step 6: Check nginx configuration (if using nginx)
```bash
cat /etc/nginx/sites-available/default | grep -A 10 "location /"
```

Make sure it proxies ALL requests to backend, not just /api/*.

## Common Issues & Fixes

### Issue 1: Bot detection not working
**Symptom:** Returns JSON error for bots
**Fix:**
```bash
cd /root/IT
git pull origin main
cd backend
npm install
pm2 restart all
```

### Issue 2: Files missing
**Symptom:** Cannot find botDetection.js or prerenderRoutes.js
**Fix:** Make sure you committed and pushed all files:
```bash
# On local machine
git status
git add backend/middleware/botDetection.js
git add backend/routes/prerenderRoutes.js
git commit -m "Add missing files"
git push origin main
```

### Issue 3: Module export error
**Symptom:** Error: generateHomepageHTML is not a function
**Fix:** Check prerenderRoutes.js has at the end:
```javascript
router.generateHomepageHTML = generateHomepageHTML;
module.exports = router;
```

### Issue 4: Frontend not building
**Symptom:** frontend/dist/ folder missing
**Fix:**
```bash
cd /root/IT/frontend
npm install
npm run build
```

### Issue 5: Port 3001 not accessible
**Symptom:** Connection refused
**Fix:**
```bash
pm2 restart backend
netstat -tlnp | grep 3001
```

## Quick Test Script for Production

Create this file on the server: `/root/test-bot.sh`
```bash
#!/bin/bash
echo "=== Testing as Googlebot ==="
curl -A "Mozilla/5.0 (compatible; Googlebot/2.1)" http://localhost:3001/ -s | head -50

echo ""
echo "=== Testing as Regular Browser ==="
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" http://localhost:3001/ -s | head -50
```

Make executable and run:
```bash
chmod +x /root/test-bot.sh
/root/test-bot.sh
```

## Expected Output

**As Googlebot (first test):**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>International Tijarat - Premium Online Shopping...</title>
    ...
    <div class="product-item">
```

**As Regular Browser (second test):**
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    ...
    <div id="root"></div>
```

## What to Check in PM2 Logs

```bash
pm2 logs backend --lines 200
```

Look for these indicators:

✅ **Success:**
- `🤖 Bot detected, serving prerendered HTML: Googlebot...`
- No errors about `isBotRequest` or `generateHomepageHTML`

❌ **Error:**
- `Error: Cannot find module './middleware/botDetection'`
- `TypeError: prerenderRoutes.generateHomepageHTML is not a function`
- `ReferenceError: isBotRequest is not defined`

## Last Resort: Manual File Check

```bash
cd /root/IT/backend
cat api.js | grep -A 20 "Dynamic rendering:"
cat routes/prerenderRoutes.js | tail -20
cat middleware/botDetection.js | head -30
```

This will show if the code is actually there.

---

**Next Steps After Diagnostics:**

1. Run the tests above
2. Share the output with me
3. I'll help fix any specific errors found
