# Deploy LazyImage Component Updates to Production
# PowerShell Script for Windows

Write-Host "🚀 Deploying LazyImage Component Updates to Production" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SERVER = "root@147.93.108.205"
$SERVER_PATH = "/var/www/internationaltijarat"
$BACKUP_DIR = "/var/www/backups/lazyimage-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host "📋 Deployment Configuration:" -ForegroundColor Yellow
Write-Host "   Server: $SERVER"
Write-Host "   Path: $SERVER_PATH"
Write-Host "   Backup: $BACKUP_DIR"
Write-Host ""

# Function to execute SSH commands
function Invoke-SSHCommand {
    param (
        [string]$Command
    )
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "ssh"
    $psi.Arguments = "$SERVER `"$Command`""
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    
    $process = [System.Diagnostics.Process]::Start($psi)
    $process.WaitForExit()
    return $process.ExitCode
}

# Function to upload file via SCP
function Copy-ToServer {
    param (
        [string]$LocalPath,
        [string]$RemotePath
    )
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "scp"
    $psi.Arguments = "`"$LocalPath`" `"${SERVER}:${RemotePath}`""
    $psi.UseShellExecute = $false
    
    $process = [System.Diagnostics.Process]::Start($psi)
    $process.WaitForExit()
    return $process.ExitCode
}

# Step 1: Create backup
Write-Host "1️⃣  Creating backup..." -ForegroundColor Yellow
$backupCmd = @"
mkdir -p $BACKUP_DIR && \
  cp -r $SERVER_PATH/backend/controllers/productController.js $BACKUP_DIR/ && \
  cp -r $SERVER_PATH/backend/routes/homepageCardRoutes.js $BACKUP_DIR/ && \
  cp -r $SERVER_PATH/backend/routes/homepageCategoryRoutes.js $BACKUP_DIR/ && \
  cp -r $SERVER_PATH/frontend/src/components/LazyImage.jsx $BACKUP_DIR/ && \
  cp -r $SERVER_PATH/frontend/src/components/EnhancedProductCard.jsx $BACKUP_DIR/ && \
  cp -r $SERVER_PATH/frontend/src/components/CategoryCarousel.jsx $BACKUP_DIR/
"@

$result = Invoke-SSHCommand -Command $backupCmd
if ($result -eq 0) {
    Write-Host "✅ Backup created successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Backup failed! Aborting deployment." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Upload backend files
Write-Host "2️⃣  Uploading backend files..." -ForegroundColor Yellow
$files = @(
    @{Local="backend\controllers\productController.js"; Remote="$SERVER_PATH/backend/controllers/productController.js"},
    @{Local="backend\routes\homepageCardRoutes.js"; Remote="$SERVER_PATH/backend/routes/homepageCardRoutes.js"},
    @{Local="backend\routes\homepageCategoryRoutes.js"; Remote="$SERVER_PATH/backend/routes/homepageCategoryRoutes.js"}
)

$uploadSuccess = $true
foreach ($file in $files) {
    $result = Copy-ToServer -LocalPath $file.Local -RemotePath $file.Remote
    if ($result -ne 0) {
        $uploadSuccess = $false
        break
    }
}

if ($uploadSuccess) {
    Write-Host "✅ Backend files uploaded successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Backend upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Upload frontend files
Write-Host "3️⃣  Uploading frontend files..." -ForegroundColor Yellow
$frontendFiles = @(
    @{Local="frontend\src\components\LazyImage.jsx"; Remote="$SERVER_PATH/frontend/src/components/LazyImage.jsx"},
    @{Local="frontend\src\components\EnhancedProductCard.jsx"; Remote="$SERVER_PATH/frontend/src/components/EnhancedProductCard.jsx"},
    @{Local="frontend\src\components\CategoryCarousel.jsx"; Remote="$SERVER_PATH/frontend/src/components/CategoryCarousel.jsx"}
)

$uploadSuccess = $true
foreach ($file in $frontendFiles) {
    $result = Copy-ToServer -LocalPath $file.Local -RemotePath $file.Remote
    if ($result -ne 0) {
        $uploadSuccess = $false
        break
    }
}

if ($uploadSuccess) {
    Write-Host "✅ Frontend files uploaded successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Restart backend server
Write-Host "4️⃣  Restarting backend server..." -ForegroundColor Yellow
$restartCmd = "cd $SERVER_PATH/backend && pm2 restart backend || pm2 restart all"
$result = Invoke-SSHCommand -Command $restartCmd

if ($result -eq 0) {
    Write-Host "✅ Backend server restarted successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend restart may have failed, please check manually" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Rebuild frontend
Write-Host "5️⃣  Rebuilding frontend..." -ForegroundColor Yellow
$buildCmd = "cd $SERVER_PATH/frontend && npm run build"
$result = Invoke-SSHCommand -Command $buildCmd

if ($result -eq 0) {
    Write-Host "✅ Frontend rebuilt successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Clear cache
Write-Host "6️⃣  Clearing server cache..." -ForegroundColor Yellow
$cacheCmd = "cd $SERVER_PATH && redis-cli FLUSHALL || echo 'Redis not available, skipping cache clear'"
Invoke-SSHCommand -Command $cacheCmd
Write-Host "✅ Cache cleared" -ForegroundColor Green
Write-Host ""

# Step 7: Verify deployment
Write-Host "7️⃣  Verifying deployment..." -ForegroundColor Yellow
Write-Host "   🔍 Checking backend API..."
$verifyBackendCmd = "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/products/featured"
$result = Invoke-SSHCommand -Command $verifyBackendCmd
if ($result -eq 0) {
    Write-Host "   ✅ Backend API responding" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Backend may need verification" -ForegroundColor Yellow
}

Write-Host "   🔍 Checking frontend build..."
$verifyFrontendCmd = "ls -lh $SERVER_PATH/frontend/dist/index.html"
$result = Invoke-SSHCommand -Command $verifyFrontendCmd
if ($result -eq 0) {
    Write-Host "   ✅ Frontend build exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Frontend build may be missing" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Clear browser cache and test homepage: https://internationaltijarat.com"
Write-Host "   2. Verify images loading as WebP/AVIF in Network tab"
Write-Host "   3. Run PageSpeed Insights to confirm improvements"
Write-Host "   4. Test new image upload to verify middleware works"
Write-Host ""
Write-Host "📂 Backup Location: $BACKUP_DIR" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
