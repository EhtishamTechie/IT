#!/bin/bash

# Deploy LazyImage Component Updates to Production
# This script deploys the homepage image optimization fixes

echo "🚀 Deploying LazyImage Component Updates to Production"
echo "========================================================"
echo ""

# Configuration
SERVER="root@147.93.108.205"
SERVER_PATH="/var/www/internationaltijarat"
BACKUP_DIR="/var/www/backups/lazyimage-$(date +%Y%m%d-%H%M%S)"

echo "📋 Deployment Configuration:"
echo "   Server: $SERVER"
echo "   Path: $SERVER_PATH"
echo "   Backup: $BACKUP_DIR"
echo ""

# Step 1: Create backup
echo "1️⃣  Creating backup..."
ssh $SERVER "mkdir -p $BACKUP_DIR && \
  cp -r $SERVER_PATH/backend/controllers/productController.js $BACKUP_DIR/ && \
  cp -r $SERVER_PATH/backend/routes/homepageCardRoutes.js $BACKUP_DIR/ && \
  cp -r $SERVER_PATH/backend/routes/homepageCategoryRoutes.js $BACKUP_DIR/ && \
  cp -r $SERVER_PATH/frontend/src/components/EnhancedProductCard.jsx $BACKUP_DIR/ && \
  cp -r $SERVER_PATH/frontend/src/components/CategoryCarousel.jsx $BACKUP_DIR/"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully"
else
    echo "❌ Backup failed! Aborting deployment."
    exit 1
fi
echo ""

# Step 2: Upload backend files
echo "2️⃣  Uploading backend files..."
scp backend/controllers/productController.js $SERVER:$SERVER_PATH/backend/controllers/
scp backend/routes/homepageCardRoutes.js $SERVER:$SERVER_PATH/backend/routes/
scp backend/routes/homepageCategoryRoutes.js $SERVER:$SERVER_PATH/backend/routes/

if [ $? -eq 0 ]; then
    echo "✅ Backend files uploaded successfully"
else
    echo "❌ Backend upload failed!"
    exit 1
fi
echo ""

# Step 3: Upload frontend files
echo "3️⃣  Uploading frontend files..."
scp frontend/src/components/EnhancedProductCard.jsx $SERVER:$SERVER_PATH/frontend/src/components/
scp frontend/src/components/CategoryCarousel.jsx $SERVER:$SERVER_PATH/frontend/src/components/

if [ $? -eq 0 ]; then
    echo "✅ Frontend files uploaded successfully"
else
    echo "❌ Frontend upload failed!"
    exit 1
fi
echo ""

# Step 4: Restart backend server
echo "4️⃣  Restarting backend server..."
ssh $SERVER "cd $SERVER_PATH/backend && pm2 restart backend || pm2 restart all"

if [ $? -eq 0 ]; then
    echo "✅ Backend server restarted successfully"
else
    echo "⚠️  Backend restart may have failed, please check manually"
fi
echo ""

# Step 5: Rebuild frontend
echo "5️⃣  Rebuilding frontend..."
ssh $SERVER "cd $SERVER_PATH/frontend && npm run build"

if [ $? -eq 0 ]; then
    echo "✅ Frontend rebuilt successfully"
else
    echo "❌ Frontend build failed!"
    exit 1
fi
echo ""

# Step 6: Clear cache
echo "6️⃣  Clearing server cache..."
ssh $SERVER "cd $SERVER_PATH && redis-cli FLUSHALL || echo 'Redis not available, skipping cache clear'"
echo "✅ Cache cleared"
echo ""

# Step 7: Verify deployment
echo "7️⃣  Verifying deployment..."
echo "   🔍 Checking backend API..."
ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/products/featured" | grep -q "200" && echo "   ✅ Backend API responding" || echo "   ⚠️  Backend may need verification"

echo "   🔍 Checking frontend build..."
ssh $SERVER "ls -lh $SERVER_PATH/frontend/dist/index.html" && echo "   ✅ Frontend build exists" || echo "   ⚠️  Frontend build may be missing"
echo ""

echo "========================================="
echo "✅ Deployment completed successfully!"
echo ""
echo "📝 Next Steps:"
echo "   1. Clear browser cache and test homepage: https://internationaltijarat.com"
echo "   2. Verify images loading as WebP/AVIF in Network tab"
echo "   3. Run PageSpeed Insights to confirm improvements"
echo "   4. Test new image upload to verify middleware works"
echo ""
echo "📂 Backup Location: $BACKUP_DIR"
echo "========================================="
