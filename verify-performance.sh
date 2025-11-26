#!/bin/bash

# Performance Verification Script
# Tests all performance optimizations to ensure they're working

echo "🔍 Performance Optimization Verification"
echo "========================================="
echo ""

API_URL=${1:-"http://localhost:3001"}
FRONTEND_URL=${2:-"http://localhost:5173"}

echo "Testing API: $API_URL"
echo "Testing Frontend: $FRONTEND_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() {
    echo -e "${GREEN}✓ PASS${NC} - $1"
}

fail() {
    echo -e "${RED}✗ FAIL${NC} - $1"
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC} - $1"
}

# Test 1: Compression
echo "1. Testing GZIP Compression..."
COMPRESSION=$(curl -s -H "Accept-Encoding: gzip" -I "$API_URL/api/products" | grep -i "content-encoding: gzip")
if [ -n "$COMPRESSION" ]; then
    pass "GZIP compression is enabled"
else
    fail "GZIP compression is NOT enabled"
fi
echo ""

# Test 2: Cache Headers - API
echo "2. Testing API Cache Headers..."
CACHE_CONTROL=$(curl -s -I "$API_URL/api/products" | grep -i "cache-control")
if [ -n "$CACHE_CONTROL" ]; then
    pass "Cache-Control header present: $CACHE_CONTROL"
else
    fail "Cache-Control header missing"
fi
echo ""

# Test 3: Cache Headers - Static Files
echo "3. Testing Static File Cache Headers..."
STATIC_CACHE=$(curl -s -I "$API_URL/uploads/products/test.jpg" 2>/dev/null | grep -i "cache-control")
if [ -n "$STATIC_CACHE" ]; then
    pass "Static file cache headers present: $STATIC_CACHE"
else
    warn "Could not verify static file cache headers (file may not exist)"
fi
echo ""

# Test 4: ETag Support
echo "4. Testing ETag Support..."
ETAG=$(curl -s -I "$API_URL/api/products" | grep -i "etag")
if [ -n "$ETAG" ]; then
    pass "ETag support enabled"
else
    warn "ETag header not found"
fi
echo ""

# Test 5: Security Headers
echo "5. Testing Security Headers..."
SECURITY=$(curl -s -I "$API_URL/api/products" | grep -i "x-content-type-options")
if [ -n "$SECURITY" ]; then
    pass "Security headers present"
else
    warn "Security headers not found"
fi
echo ""

# Test 6: Response Size (with compression)
echo "6. Testing Response Size..."
SIZE_COMPRESSED=$(curl -s -H "Accept-Encoding: gzip" "$API_URL/api/products" | wc -c)
SIZE_UNCOMPRESSED=$(curl -s "$API_URL/api/products" | wc -c)

if [ "$SIZE_COMPRESSED" -lt "$SIZE_UNCOMPRESSED" ]; then
    SAVINGS=$((100 - (SIZE_COMPRESSED * 100 / SIZE_UNCOMPRESSED)))
    pass "Compression working: $SAVINGS% size reduction ($SIZE_UNCOMPRESSED → $SIZE_COMPRESSED bytes)"
else
    fail "Compression not reducing size"
fi
echo ""

# Test 7: Frontend Bundle
echo "7. Testing Frontend Build..."
if [ -d "frontend/dist" ]; then
    # Check for console logs in production bundle
    if grep -r "console.log" frontend/dist/assets/*.js > /dev/null 2>&1; then
        fail "Console logs found in production bundle"
    else
        pass "Console logs removed from production bundle"
    fi
    
    # Check bundle size
    BUNDLE_SIZE=$(du -sh frontend/dist/assets | awk '{print $1}')
    echo "  Bundle size: $BUNDLE_SIZE"
    
    # Count chunks
    CHUNK_COUNT=$(ls frontend/dist/assets/*.js 2>/dev/null | wc -l)
    echo "  Number of JS chunks: $CHUNK_COUNT"
    pass "Frontend build exists"
else
    fail "Frontend build not found (run 'npm run build' first)"
fi
echo ""

# Test 8: Middleware Files
echo "8. Testing Backend Middleware..."
if [ -f "backend/middleware/compression.js" ]; then
    pass "Compression middleware exists"
else
    fail "Compression middleware missing"
fi

if [ -f "backend/middleware/cacheHeaders.js" ]; then
    pass "Cache headers middleware exists"
else
    fail "Cache headers middleware missing"
fi
echo ""

# Test 9: Response Time
echo "9. Testing Response Time..."
START=$(date +%s%N)
curl -s "$API_URL/api/products" > /dev/null
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))

if [ "$DURATION" -lt 500 ]; then
    pass "API response time: ${DURATION}ms (good)"
elif [ "$DURATION" -lt 1000 ]; then
    warn "API response time: ${DURATION}ms (acceptable)"
else
    fail "API response time: ${DURATION}ms (too slow)"
fi
echo ""

# Test 10: Vary Header
echo "10. Testing Vary Header (for CDN)..."
VARY=$(curl -s -I "$API_URL/api/products" | grep -i "vary")
if [ -n "$VARY" ]; then
    pass "Vary header present: $VARY"
else
    warn "Vary header missing (CDN caching may not work optimally)"
fi
echo ""

# Summary
echo "========================================="
echo "📊 Verification Summary"
echo "========================================="
echo ""
echo "Tested Against:"
echo "  API: $API_URL"
echo "  Frontend: $FRONTEND_URL"
echo ""
echo "Key Metrics:"
echo "  Compression: $([ -n "$COMPRESSION" ] && echo 'Enabled ✓' || echo 'Disabled ✗')"
echo "  Cache Headers: $([ -n "$CACHE_CONTROL" ] && echo 'Enabled ✓' || echo 'Missing ✗')"
echo "  Response Time: ${DURATION}ms"
echo "  Compression Savings: ${SAVINGS}%"
echo ""
echo "Next Steps:"
echo "  1. Deploy to production"
echo "  2. Run PageSpeed Insights: https://pagespeed.web.dev/"
echo "  3. Monitor with Chrome DevTools"
echo "  4. Check Core Web Vitals in Google Analytics"
echo ""
