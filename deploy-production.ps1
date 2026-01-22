# Production Deployment Script for Windows
# This script ensures proper build and deployment of the admin panel

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Production Deployment Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Clean previous build
Write-Host "Step 1: Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "frontend\dist") {
    Remove-Item -Recurse -Force "frontend\dist"
    Write-Host "✅ Cleaned frontend/dist directory" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No previous build found" -ForegroundColor Gray
}

# Step 2: Build Frontend
Write-Host "`nStep 2: Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..
Write-Host "✅ Frontend build completed" -ForegroundColor Green

# Step 3: Verify Build
Write-Host "`nStep 3: Verifying build output..." -ForegroundColor Yellow
if (Test-Path "frontend\dist\index.html") {
    Write-Host "✅ index.html found" -ForegroundColor Green
} else {
    Write-Host "❌ index.html NOT found - build failed!" -ForegroundColor Red
    exit 1
}

$jsFiles = Get-ChildItem -Path "frontend\dist\assets\js" -Filter "*.js" -ErrorAction SilentlyContinue
if ($jsFiles.Count -gt 0) {
    Write-Host "✅ Found $($jsFiles.Count) JavaScript files" -ForegroundColor Green
    Write-Host "   Sample files:" -ForegroundColor Gray
    $jsFiles | Select-Object -First 3 | ForEach-Object {
        Write-Host "   - $($_.Name)" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ No JavaScript files found - build failed!" -ForegroundColor Red
    exit 1
}

$jsxFiles = Get-ChildItem -Path "frontend\dist" -Filter "*.jsx" -Recurse -ErrorAction SilentlyContinue
if ($jsxFiles.Count -eq 0) {
    Write-Host "✅ No JSX source files in dist (correct)" -ForegroundColor Green
} else {
    Write-Host "❌ WARNING: Found $($jsxFiles.Count) JSX files in dist!" -ForegroundColor Red
    Write-Host "   This indicates a build configuration issue!" -ForegroundColor Red
}

# Step 4: Check Environment Variables
Write-Host "`nStep 4: Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path "frontend\.env.production") {
    Write-Host "✅ Production environment file exists" -ForegroundColor Green
    $envContent = Get-Content "frontend\.env.production" | Select-Object -First 5
    Write-Host "   First few lines:" -ForegroundColor Gray
    $envContent | ForEach-Object {
        Write-Host "   $_" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  WARNING: frontend/.env.production not found" -ForegroundColor Yellow
}

# Step 5: Display deployment instructions
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next steps for deployment:" -ForegroundColor Yellow
Write-Host "1. Upload the entire project to your production server" -ForegroundColor White
Write-Host "2. On the server, run: npm install" -ForegroundColor White
Write-Host "3. On the server, run: cd backend && npm install" -ForegroundColor White
Write-Host "4. Start the server: cd backend && node api.js" -ForegroundColor White
Write-Host "5. Clear Cloudflare cache:" -ForegroundColor White
Write-Host "   - Go to Cloudflare Dashboard > Caching > Purge Everything" -ForegroundColor Gray
Write-Host "6. Test the admin panel at: https://internationaltijarat.com/admin" -ForegroundColor White

Write-Host "`nImportant Production Environment Variables:" -ForegroundColor Yellow
Write-Host "Backend (.env):" -ForegroundColor White
Write-Host "  - NODE_ENV=production" -ForegroundColor Gray
Write-Host "  - JWT_SECRET=<your-secret>" -ForegroundColor Gray
Write-Host "  - MONGODB_URI=<your-mongodb-connection>" -ForegroundColor Gray
Write-Host "  - PORT=3001" -ForegroundColor Gray

Write-Host "`nFrontend (.env.production):" -ForegroundColor White
Write-Host "  - VITE_API_URL=https://internationaltijarat.com/api" -ForegroundColor Gray
Write-Host "  - VITE_IMAGE_URL=https://internationaltijarat.com" -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deployment preparation complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
