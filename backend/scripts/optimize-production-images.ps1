# Production Image Optimization Script (PowerShell)
# This script safely optimizes images on Windows or production server
#
# Usage:
#   .\optimize-production-images.ps1                # Optimize all images
#   .\optimize-production-images.ps1 -DryRun        # Preview only
#   .\optimize-production-images.ps1 -Directory products  # Specific folder

param(
    [switch]$DryRun,
    [string]$Directory = ""
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🚀 Production Image Optimization" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    exit 1
}

# Check if Sharp is installed
$sharpInstalled = & node -e "try { require('sharp'); console.log('true'); } catch(e) { console.log('false'); }" 2>$null

if ($sharpInstalled -ne "true") {
    Write-Host "📦 Installing Sharp (image processing library)..." -ForegroundColor Yellow
    npm install sharp --save
}

# Build command arguments
$args = @()
if ($DryRun) {
    $args += "--dry-run"
    Write-Host "⚠️  DRY RUN MODE - No files will be modified" -ForegroundColor Yellow
    Write-Host ""
}

if ($Directory -ne "") {
    $args += "--directory=$Directory"
    Write-Host "📁 Processing directory: $Directory" -ForegroundColor Cyan
    Write-Host ""
}

# Create backup directory
$backupDir = "uploads-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "💾 Creating backup directory: $backupDir" -ForegroundColor Cyan

if (!$DryRun) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "✅ Backup directory created" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: If something goes wrong, you can restore from:" -ForegroundColor Yellow
    Write-Host "   $backupDir\" -ForegroundColor Yellow
    Write-Host ""
}

# Show disk space before
Write-Host "📊 Disk space before optimization:" -ForegroundColor Cyan
$drive = (Get-Location).Drive
$freeBefore = [math]::Round((Get-PSDrive $drive.Name).Free / 1GB, 2)
Write-Host "   Free space: $freeBefore GB" -ForegroundColor Gray
Write-Host ""

# Confirmation prompt (skip in dry-run)
if (!$DryRun) {
    $confirmation = Read-Host "⚠️  This will optimize all images. Continue? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-Host "❌ Optimization cancelled" -ForegroundColor Red
        exit 1
    }
}

# Run the optimization script
Write-Host ""
Write-Host "🔄 Starting optimization..." -ForegroundColor Cyan
Write-Host ""

$scriptPath = "scripts\optimize-existing-images.js"
if ($args.Count -gt 0) {
    & node $scriptPath $args
} else {
    & node $scriptPath
}

$optimizationStatus = $LASTEXITCODE

# Show results
if ($optimizationStatus -eq 0) {
    Write-Host ""
    Write-Host "✅ Optimization completed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Show disk space after
    if (!$DryRun) {
        Write-Host "📊 Disk space after optimization:" -ForegroundColor Cyan
        $freeAfter = [math]::Round((Get-PSDrive $drive.Name).Free / 1GB, 2)
        $saved = [math]::Round($freeAfter - $freeBefore, 2)
        Write-Host "   Free space: $freeAfter GB" -ForegroundColor Gray
        if ($saved -lt 0) {
            Write-Host "   Space saved: $((-$saved)) GB" -ForegroundColor Green
        }
        Write-Host ""
        
        # Check if report exists
        if (Test-Path "optimization-report.json") {
            Write-Host "📄 Detailed report saved: optimization-report.json" -ForegroundColor Cyan
            Write-Host ""
        }
        
        Write-Host "💡 Next steps:" -ForegroundColor Yellow
        Write-Host "   1. Test your website to ensure images load correctly"
        Write-Host "   2. Check PageSpeed Insights for performance improvements"
        Write-Host "   3. If everything works, you can delete the backup:"
        Write-Host "      Remove-Item -Recurse -Force $backupDir"
        Write-Host ""
    }
} else {
    Write-Host ""
    Write-Host "❌ Optimization failed with errors" -ForegroundColor Red
    Write-Host ""
    
    if ($DryRun) {
        Write-Host "💡 This was a dry run. No files were modified." -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  Some files may have been modified. Check the backup if needed:" -ForegroundColor Yellow
        Write-Host "   $backupDir\" -ForegroundColor Yellow
    }
    Write-Host ""
    exit 1
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "✅ Process Complete" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
