#!/bin/bash
# Production Server Deployment Script
# Run this on your production server (147.93.108.205)

echo "======================================"
echo "🚀 Deploying Dynamic Rendering Fix"
echo "======================================"
echo ""

# Step 1: Navigate to project
cd /root/IT || exit 1
echo "✅ Changed to /root/IT"

# Step 2: Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull origin main
echo ""

# Step 3: Check if critical files exist
echo "🔍 Checking critical files..."
if [ -f "backend/middleware/botDetection.js" ]; then
    echo "✅ botDetection.js exists"
else
    echo "❌ ERROR: botDetection.js NOT FOUND!"
    exit 1
fi

if [ -f "backend/routes/prerenderRoutes.js" ]; then
    echo "✅ prerenderRoutes.js exists"
else
    echo "❌ ERROR: prerenderRoutes.js NOT FOUND!"
    exit 1
fi
echo ""

# Step 4: Install any new dependencies
echo "📦 Installing dependencies..."
cd backend
npm install --production
echo ""

# Step 5: Restart backend server
echo "🔄 Restarting backend server..."
pm2 restart backend
sleep 3
echo ""

# Step 6: Check server status
echo "📊 Server Status:"
pm2 list
echo ""

# Step 7: Test bot detection
echo "🤖 Testing Bot Detection..."
echo "=== As Googlebot ==="
curl -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
     http://localhost:3001/ -s | head -30
echo ""
echo ""

echo "=== As Regular Browser ==="
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
     http://localhost:3001/ -s | head -30
echo ""
echo ""

# Step 8: Test prerender endpoint
echo "🌐 Testing Prerender API..."
curl http://localhost:3001/api/prerender/homepage -s | head -30
echo ""
echo ""

# Step 9: Check logs for errors
echo "📋 Recent Logs (last 30 lines):"
pm2 logs backend --lines 30 --nostream
echo ""

echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. If you see HTML with products above, bot detection is working ✅"
echo "2. Go to Google Search Console"
echo "3. URL Inspection → Test Live URL for https://internationaltijarat.com"
echo "4. Click 'Request Indexing'"
echo ""
