# Automated Production Deployment via SSH
# This runs from your local machine and fixes the remote server

$SERVER = "147.93.108.205"
$USER = "root"
$PATH = "/var/www/internationaltijarat"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying to Production Server" -ForegroundColor Cyan
Write-Host "Server: $SERVER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Upload fix scripts
Write-Host "Step 1: Uploading fix scripts..." -ForegroundColor Yellow
scp fix-production-server.sh ${USER}@${SERVER}:${PATH}/
scp production-quick-fix.sh ${USER}@${SERVER}:${PATH}/
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Scripts uploaded" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to upload scripts" -ForegroundColor Red
    exit 1
}

# Step 2: Run diagnostic
Write-Host "`nStep 2: Running diagnostic..." -ForegroundColor Yellow
ssh ${USER}@${SERVER} "cd ${PATH} && chmod +x fix-production-server.sh && ./fix-production-server.sh"

# Step 3: Ask user to confirm
Write-Host "`n========================================" -ForegroundColor Cyan
$confirm = Read-Host "Do you want to proceed with the fix? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

# Step 4: Run the fix
Write-Host "`nStep 3: Running production fix..." -ForegroundColor Yellow
ssh ${USER}@${SERVER} "cd ${PATH} && chmod +x production-quick-fix.sh && ./production-quick-fix.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Production fix completed!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Clear Cloudflare cache at: https://dash.cloudflare.com" -ForegroundColor White
    Write-Host "2. Test admin panel at: https://internationaltijarat.com/admin" -ForegroundColor White
} else {
    Write-Host "`n❌ Fix failed - check output above" -ForegroundColor Red
}
