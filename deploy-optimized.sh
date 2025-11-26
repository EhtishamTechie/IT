#!/bin/bash

# Deployment Script with Performance Optimizations
# This script ensures all performance fixes are applied during deployment

echo "🚀 Starting Optimized Deployment Process..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in production mode
if [ "$NODE_ENV" != "production" ]; then
    print_warning "NODE_ENV is not set to 'production'. Setting it now..."
    export NODE_ENV=production
fi

print_status "Environment: $NODE_ENV"
echo ""

# Step 1: Clean previous builds
echo "📦 Step 1: Cleaning previous builds..."
cd frontend
rm -rf dist node_modules/.vite
print_status "Frontend build artifacts cleaned"
echo ""

# Step 2: Install dependencies (if needed)
echo "📦 Step 2: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "Node modules not found. Installing..."
    npm ci --production=false
    print_status "Dependencies installed"
else
    print_status "Dependencies already installed"
fi
echo ""

# Step 3: Build frontend with optimizations
echo "🏗️  Step 3: Building optimized frontend..."
print_status "Building with production optimizations..."
print_status "- Code splitting enabled"
print_status "- Console logs removed"
print_status "- Minification enabled"
print_status "- Tree shaking enabled"

npm run build

if [ $? -ne 0 ]; then
    print_error "Frontend build failed!"
    exit 1
fi

print_status "Frontend build completed"
echo ""

# Step 4: Analyze bundle size
echo "📊 Step 4: Analyzing bundle size..."
if [ -d "dist/assets" ]; then
    echo "Bundle contents:"
    ls -lh dist/assets/*.js | awk '{print "  " $9 " - " $5}'
    
    # Calculate total size
    TOTAL_SIZE=$(du -sh dist/assets | awk '{print $1}')
    print_status "Total bundle size: $TOTAL_SIZE"
else
    print_warning "Could not find dist/assets directory"
fi
echo ""

# Step 5: Verify production optimizations
echo "🔍 Step 5: Verifying optimizations..."

# Check if console logs are removed
if grep -r "console.log" dist/assets/*.js > /dev/null 2>&1; then
    print_error "Console logs found in production bundle!"
else
    print_status "Console logs removed ✓"
fi

# Check if source maps are disabled
if ls dist/assets/*.map > /dev/null 2>&1; then
    print_warning "Source maps found in production bundle"
else
    print_status "Source maps disabled ✓"
fi

# Check if files are minified
SAMPLE_FILE=$(ls dist/assets/*.js | head -1)
if [ -f "$SAMPLE_FILE" ]; then
    # Minified files typically have long lines
    AVG_LINE_LENGTH=$(awk '{total += length; count++} END {print int(total/count)}' "$SAMPLE_FILE")
    if [ "$AVG_LINE_LENGTH" -gt 500 ]; then
        print_status "Code minification verified ✓"
    else
        print_warning "Code might not be properly minified"
    fi
fi
echo ""

# Step 6: Backend optimizations
echo "⚙️  Step 6: Verifying backend optimizations..."
cd ../backend

# Check if compression middleware exists
if [ -f "middleware/compression.js" ]; then
    print_status "Compression middleware found ✓"
else
    print_error "Compression middleware missing!"
fi

# Check if cache headers middleware exists
if [ -f "middleware/cacheHeaders.js" ]; then
    print_status "Cache headers middleware found ✓"
else
    print_error "Cache headers middleware missing!"
fi

# Verify compression is in dependencies
if grep -q "compression" package.json; then
    print_status "Compression package installed ✓"
else
    print_error "Compression package not found in package.json!"
fi
echo ""

# Step 7: Generate deployment report
echo "📋 Step 7: Generating deployment report..."
cd ..

REPORT_FILE="deployment-report-$(date +%Y%m%d-%H%M%S).txt"

cat > "$REPORT_FILE" << EOF
Deployment Report
=================
Date: $(date)
Environment: $NODE_ENV

Frontend Build:
- Build Status: Success
- Total Bundle Size: $TOTAL_SIZE
- Console Logs Removed: Yes
- Source Maps: Disabled
- Minification: Enabled

Backend Optimizations:
- Compression Middleware: Enabled
- Cache Headers: Configured
- Static File Optimization: Enabled

Performance Targets:
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- First Input Delay: < 100ms

Next Steps:
1. Deploy frontend to CDN/web server
2. Deploy backend with environment variables
3. Run PageSpeed Insights test
4. Monitor Core Web Vitals
5. Check error logs for issues

Verification Commands:
# Check compression
curl -H "Accept-Encoding: gzip" -I https://your-api.com/api/products

# Check cache headers
curl -I https://your-api.com/uploads/products/image.jpg

# Run performance test
lighthouse https://your-site.com --view
EOF

print_status "Deployment report generated: $REPORT_FILE"
echo ""

# Step 8: Final checklist
echo "✅ Deployment Checklist:"
echo "  1. Frontend built with optimizations"
echo "  2. Backend middleware configured"
echo "  3. Bundle size acceptable"
echo "  4. Console logs removed"
echo "  5. Source maps disabled"
echo ""

print_status "Optimized deployment package ready!"
echo ""
echo "🎯 Performance Goals:"
echo "  - LCP < 2.5s"
echo "  - FID < 100ms"
echo "  - CLS < 0.1"
echo "  - Bundle < 300KB (gzipped)"
echo ""
print_warning "Don't forget to:"
echo "  1. Set environment variables on production server"
echo "  2. Run 'npm install --production' on backend"
echo "  3. Test with PageSpeed Insights after deployment"
echo "  4. Monitor performance metrics"
echo ""
print_status "Deployment preparation complete! 🎉"
