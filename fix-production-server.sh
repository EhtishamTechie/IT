#!/bin/bash
# Production Server Diagnostic and Fix Script
# Run this ON YOUR SERVER: ssh root@147.93.108.205
# Then: cd /var/www/internationaltijarat && bash fix-production-server.sh

echo "========================================"
echo "Production Server Diagnostic"
echo "Server: 147.93.108.205"
echo "Path: /var/www/internationaltijarat"
echo "========================================"

# Check 1: Does dist folder exist?
echo ""
echo "CHECK 1: Frontend dist folder"
echo "--------------------------------"
if [ -d "/var/www/internationaltijarat/frontend/dist" ]; then
    echo "✅ frontend/dist EXISTS"
    
    # Count files
    FILE_COUNT=$(find /var/www/internationaltijarat/frontend/dist -type f | wc -l)
    echo "   Total files in dist: $FILE_COUNT"
    
    # Check for index.html
    if [ -f "/var/www/internationaltijarat/frontend/dist/index.html" ]; then
        echo "✅ index.html found"
    else
        echo "❌ index.html NOT FOUND - Build incomplete!"
    fi
    
    # Check for JavaScript files
    JS_COUNT=$(find /var/www/internationaltijarat/frontend/dist/assets/js -name "*.js" 2>/dev/null | wc -l)
    if [ $JS_COUNT -gt 0 ]; then
        echo "✅ Found $JS_COUNT JavaScript files"
        echo "   Sample files:"
        find /var/www/internationaltijarat/frontend/dist/assets/js -name "*.js" 2>/dev/null | head -3
    else
        echo "❌ NO JavaScript files found - Build missing!"
    fi
    
    # Check for JSX files (should be NONE)
    JSX_COUNT=$(find /var/www/internationaltijarat/frontend/dist -name "*.jsx" 2>/dev/null | wc -l)
    if [ $JSX_COUNT -eq 0 ]; then
        echo "✅ No JSX source files (correct)"
    else
        echo "❌ CRITICAL: Found $JSX_COUNT JSX files in dist!"
        echo "   JSX files should NOT be in dist folder:"
        find /var/www/internationaltijarat/frontend/dist -name "*.jsx" 2>/dev/null
    fi
else
    echo "❌ CRITICAL: frontend/dist folder DOES NOT EXIST!"
    echo "   The frontend has never been built on this server!"
fi

# Check 2: What's actually being served?
echo ""
echo "CHECK 2: Web server configuration"
echo "--------------------------------"

# Check if nginx is running
if command -v nginx &> /dev/null; then
    echo "✅ Nginx is installed"
    
    # Find nginx config for internationaltijarat
    if [ -f "/etc/nginx/sites-available/internationaltijarat" ]; then
        echo "✅ Nginx config found"
        echo "   Config file: /etc/nginx/sites-available/internationaltijarat"
        echo ""
        echo "   Current root directory setting:"
        grep -E "^\s*root" /etc/nginx/sites-available/internationaltijarat | head -1
        echo ""
        echo "   Current location blocks:"
        grep -E "^\s*location" /etc/nginx/sites-available/internationaltijarat
    else
        echo "⚠️  Config not at standard location"
        echo "   Searching for config..."
        grep -r "internationaltijarat" /etc/nginx/ 2>/dev/null | head -5
    fi
elif command -v apache2 &> /dev/null; then
    echo "✅ Apache is installed"
    echo "   Checking DocumentRoot..."
    grep -r "DocumentRoot.*internationaltijarat" /etc/apache2/ 2>/dev/null
else
    echo "⚠️  Web server not detected"
fi

# Check 3: Node.js process
echo ""
echo "CHECK 3: Node.js backend process"
echo "--------------------------------"
if pgrep -f "node.*api.js" > /dev/null; then
    echo "✅ Node.js backend is running"
    ps aux | grep "node.*api.js" | grep -v grep
else
    echo "❌ Node.js backend is NOT running!"
fi

# Check 4: Check actual file being served
echo ""
echo "CHECK 4: Testing what's actually served"
echo "--------------------------------"
echo "Checking index.html content..."
if [ -f "/var/www/internationaltijarat/frontend/dist/index.html" ]; then
    echo "First 10 lines of dist/index.html:"
    head -10 /var/www/internationaltijarat/frontend/dist/index.html
else
    echo "❌ dist/index.html not found"
fi

# Check 5: Environment variables
echo ""
echo "CHECK 5: Environment configuration"
echo "--------------------------------"
if [ -f "/var/www/internationaltijarat/frontend/.env.production" ]; then
    echo "✅ .env.production exists"
    echo "   Content (excluding secrets):"
    grep -v "SECRET\|PASSWORD\|KEY" /var/www/internationaltijarat/frontend/.env.production | head -10
else
    echo "❌ .env.production not found"
fi

if [ -f "/var/www/internationaltijarat/backend/.env" ]; then
    echo "✅ Backend .env exists"
else
    echo "❌ Backend .env not found"
fi

# Check 6: File permissions
echo ""
echo "CHECK 6: File permissions"
echo "--------------------------------"
ls -la /var/www/internationaltijarat/ | head -10
if [ -d "/var/www/internationaltijarat/frontend/dist" ]; then
    ls -la /var/www/internationaltijarat/frontend/dist/ | head -10
fi

echo ""
echo "========================================"
echo "DIAGNOSTIC COMPLETE"
echo "========================================"
echo ""
echo "RECOMMENDED ACTIONS:"
echo ""

# Provide specific recommendations
if [ ! -d "/var/www/internationaltijarat/frontend/dist" ]; then
    echo "❌ CRITICAL ISSUE: No dist folder found"
    echo ""
    echo "FIX: Build the frontend on the server"
    echo "Run these commands:"
    echo ""
    echo "  cd /var/www/internationaltijarat/frontend"
    echo "  npm install"
    echo "  npm run build"
    echo ""
fi

if [ -d "/var/www/internationaltijarat/frontend/dist" ]; then
    JSX_COUNT=$(find /var/www/internationaltijarat/frontend/dist -name "*.jsx" 2>/dev/null | wc -l)
    if [ $JSX_COUNT -gt 0 ]; then
        echo "❌ CRITICAL ISSUE: JSX files in dist folder"
        echo ""
        echo "FIX: Rebuild the frontend"
        echo "Run these commands:"
        echo ""
        echo "  cd /var/www/internationaltijarat/frontend"
        echo "  rm -rf dist"
        echo "  npm run build"
        echo ""
    fi
fi

echo "After running fixes, restart services:"
echo "  sudo systemctl restart nginx"
echo "  pm2 restart all    # or restart your node process"
echo ""
echo "Then clear Cloudflare cache at:"
echo "  https://dash.cloudflare.com"
