#!/bin/bash
# Quick Fix Script - Run this ON YOUR SERVER
# SSH: ssh root@147.93.108.205
# Location: /var/www/internationaltijarat

echo "========================================"
echo "Quick Production Fix"
echo "========================================"

cd /var/www/internationaltijarat

# Step 1: Build Frontend
echo ""
echo "Step 1: Building frontend..."
cd frontend

# Remove old build
if [ -d "dist" ]; then
    echo "Removing old build..."
    rm -rf dist
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Build
echo "Building frontend (this may take a minute)..."
NODE_ENV=production npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Verify build
if [ -f "dist/index.html" ]; then
    echo "✅ dist/index.html created"
else
    echo "❌ Build verification failed"
    exit 1
fi

JS_COUNT=$(find dist/assets/js -name "*.js" 2>/dev/null | wc -l)
echo "✅ Created $JS_COUNT JavaScript files"

cd ..

# Step 2: Ensure backend dependencies
echo ""
echo "Step 2: Checking backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi
cd ..

# Step 3: Set proper permissions
echo ""
echo "Step 3: Setting file permissions..."
chown -R www-data:www-data /var/www/internationaltijarat
chmod -R 755 /var/www/internationaltijarat

echo "✅ Permissions set"

# Step 4: Restart services
echo ""
echo "Step 4: Restarting services..."

# Try different service restart methods
if command -v systemctl &> /dev/null; then
    echo "Restarting nginx..."
    systemctl restart nginx
    echo "✅ Nginx restarted"
fi

if command -v pm2 &> /dev/null; then
    echo "Restarting PM2 processes..."
    pm2 restart all
    echo "✅ PM2 restarted"
else
    echo "⚠️  PM2 not found - manually restart your Node.js process"
fi

echo ""
echo "========================================"
echo "✅ FIX COMPLETE"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Clear Cloudflare cache:"
echo "   Go to: https://dash.cloudflare.com"
echo "   Navigate to: Caching > Configuration"
echo "   Click: Purge Everything"
echo ""
echo "2. Test admin panel:"
echo "   https://internationaltijarat.com/admin"
echo ""
echo "3. Check browser console for any remaining errors"
echo ""
echo "If issues persist, check logs:"
echo "  pm2 logs"
echo "  tail -f /var/log/nginx/error.log"
