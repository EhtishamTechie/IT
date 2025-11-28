# Performance Optimization - Quick Deployment Script
# Run this script from the project root directory

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  PERFORMANCE OPTIMIZATION DEPLOYMENT   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Rebuild Frontend
Write-Host "[1/4] Rebuilding Frontend..." -ForegroundColor Yellow
Set-Location frontend
Remove-Item -Path dist -Recurse -Force -ErrorAction SilentlyContinue
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend build successful" -ForegroundColor Green
    
    # Check bundle sizes
    Write-Host "`nBundle Analysis:" -ForegroundColor Cyan
    Get-ChildItem -Path "dist/assets/*.js" | ForEach-Object {
        $sizeKB = [math]::Round($_.Length / 1KB, 2)
        Write-Host "  $($_.Name): $sizeKB KB" -ForegroundColor Gray
    }
    
    $totalSizeKB = [math]::Round((Get-ChildItem -Path "dist/assets" -Recurse | Measure-Object -Property Length -Sum).Sum / 1KB, 2)
    Write-Host "  Total bundle size: $totalSizeKB KB" -ForegroundColor $(if ($totalSizeKB -lt 500) { "Green" } else { "Yellow" })
} else {
    Write-Host "✗ Frontend build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

Write-Host ""

# Step 2: Check Backend Dependencies
Write-Host "[2/4] Checking Backend Dependencies..." -ForegroundColor Yellow
Set-Location backend
$hasCompression = Test-Path "middleware/compression.js"
$hasCacheHeaders = Test-Path "middleware/cacheHeaders.js"

if ($hasCompression -and $hasCacheHeaders) {
    Write-Host "✓ Backend middleware files exist" -ForegroundColor Green
} else {
    Write-Host "✗ Missing middleware files!" -ForegroundColor Red
    if (-not $hasCompression) { Write-Host "  Missing: compression.js" -ForegroundColor Red }
    if (-not $hasCacheHeaders) { Write-Host "  Missing: cacheHeaders.js" -ForegroundColor Red }
}
Set-Location ..

Write-Host ""

# Step 3: Deployment Instructions
Write-Host "[3/4] Deployment to Production Server" -ForegroundColor Yellow
Write-Host ""
Write-Host "Copy and run these commands in your SSH terminal:" -ForegroundColor Cyan
Write-Host ""
Write-Host "# Navigate to project directory" -ForegroundColor Gray
Write-Host "cd /var/www/internationaltijarat" -ForegroundColor White
Write-Host ""
Write-Host "# Backup current files" -ForegroundColor Gray
Write-Host "mv public public_backup_`$(date +%Y%m%d_%H%M%S)" -ForegroundColor White
Write-Host ""
Write-Host "# Upload new build (run from Windows):" -ForegroundColor Gray
Write-Host "scp -r frontend/dist/* root@147.93.108.205:/var/www/internationaltijarat/public/" -ForegroundColor Yellow
Write-Host ""
Write-Host "# Restart backend" -ForegroundColor Gray
Write-Host "cd backend" -ForegroundColor White
Write-Host "npm ci --production" -ForegroundColor White  
Write-Host "pm2 restart all" -ForegroundColor White
Write-Host ""

# Step 4: Verification Tests
Write-Host "[4/4] Verification Commands" -ForegroundColor Yellow
Write-Host ""
Write-Host "After deployment, run these tests:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test 1: Compression" -ForegroundColor Gray
Write-Host 'curl -I -H "Accept-Encoding: gzip" https://internationaltijarat.com/assets/index*.js' -ForegroundColor White
Write-Host "Expected: Content-Encoding: gzip" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Test 2: Cache Headers" -ForegroundColor Gray
Write-Host "curl -I https://internationaltijarat.com/assets/index*.css" -ForegroundColor White
Write-Host "Expected: Cache-Control: public, max-age=31536000" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Test 3: PageSpeed Insights" -ForegroundColor Gray
Write-Host "https://pagespeed.web.dev/" -ForegroundColor White
Write-Host "Test URL: https://internationaltijarat.com" -ForegroundColor DarkGray
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "SUCCESS CRITERIA:" -ForegroundColor Green
Write-Host "  ✓ Performance Score > 85" -ForegroundColor White
Write-Host "  ✓ LCP < 2.5s" -ForegroundColor White
Write-Host "  ✓ FCP < 1.8s" -ForegroundColor White
Write-Host "  ✓ Speed Index < 3.0s" -ForegroundColor White
Write-Host "  ✓ All Core Web Vitals GREEN" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Copy dist folder to server (use scp command above)" -ForegroundColor White
Write-Host "2. Restart backend on server" -ForegroundColor White
Write-Host "3. Run verification tests" -ForegroundColor White
Write-Host "4. Test with PageSpeed Insights" -ForegroundColor White
Write-Host ""
Write-Host "For detailed guide, see: PERFORMANCE_FIX_DEPLOYMENT.md" -ForegroundColor Cyan
