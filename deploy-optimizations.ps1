# Deploy Performance Optimizations to Production
# Phases 2-4: JavaScript Optimization, Critical Rendering, Caching

Write-Host "🚀 Deploying Performance Optimizations to Production" -ForegroundColor Green
Write-Host "=" -repeat 60

# Step 1: Commit changes
Write-Host "`n📝 Step 1: Committing changes..." -ForegroundColor Cyan
git add .
git commit -m "Performance Optimization: Phases 2-4 Complete

- Phase 2: JavaScript Bundle Optimization (-69KB vendor, 62% faster build)
  - Analytics deferred until LCP + 5s
  - Icon libraries consolidated (lucide-react only)
  - ES2020 modern output

- Phase 3: Critical Rendering Path
  - Resource preloading removed (dev conflicts fixed)
  - Layout shift fixes (hero section, product cards)
  - Fixed dimensions to prevent CLS

- Phase 4: Caching Strategy
  - HTTP cache headers optimized (images: 1yr, API: 5min)
  - React Query cache extended (10min staleTime, 1hr gcTime)

Expected improvements:
- FCP: 2.1s → 1.5s
- LCP: 3.4s → 2.5s  
- Speed Index: 7.1s → 5-6s
- Bundle: -69KB (-28%)
"

# Step 2: Push to GitHub
Write-Host "`n📤 Step 2: Pushing to GitHub..." -ForegroundColor Cyan
git push origin main

# Step 3: Deploy to production server
Write-Host "`n🌐 Step 3: Deploying to production..." -ForegroundColor Cyan
Write-Host "Connecting to server 147.93.108.205..." -ForegroundColor Yellow

ssh root@147.93.108.205 @"
echo '🔄 Pulling latest changes...'
cd /root/IT
git pull origin main

echo '📦 Installing backend dependencies...'
cd /root/IT/backend
npm install --production

echo '📦 Building frontend...'
cd /root/IT/frontend
npm install
npm run build

echo '🔄 Restarting services...'
pm2 restart all

echo '✅ Deployment complete!'
pm2 status
"@

Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
Write-Host "`n📊 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test the site: https://internationaltijarat.com"
Write-Host "2. Run PageSpeed Insights: https://pagespeed.web.dev/"
Write-Host "3. Compare metrics with baseline"
Write-Host "`nExpected Improvements:"
Write-Host "  - FCP: 2.1s → ~1.5s (28% faster)" -ForegroundColor Yellow
Write-Host "  - Speed Index: 7.1s → ~5-6s (20-30% faster)" -ForegroundColor Yellow  
Write-Host "  - Bundle Size: -69KB vendor chunk" -ForegroundColor Yellow
Write-Host "  - Build Time: 62% faster (56s → 21s)" -ForegroundColor Yellow
