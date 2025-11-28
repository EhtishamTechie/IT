#!/bin/bash

# Production Image Optimization Script for Hostinger Server
# This script safely optimizes images on the production server
#
# Usage:
#   bash optimize-production-images.sh              # Optimize all images
#   bash optimize-production-images.sh --dry-run    # Preview only
#   bash optimize-production-images.sh products     # Optimize specific folder

echo "=================================================="
echo "🚀 Production Image Optimization"
echo "=================================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if Sharp is installed
if ! node -e "require('sharp')" 2>/dev/null; then
    echo "📦 Installing Sharp (image processing library)..."
    npm install sharp --save
fi

# Parse arguments
DRY_RUN=""
DIRECTORY=""

for arg in "$@"
do
    case $arg in
        --dry-run)
            DRY_RUN="--dry-run"
            echo "⚠️  DRY RUN MODE - No files will be modified"
            echo ""
            shift
            ;;
        products|homepage-categories|homepage-cards|vendor-logos|properties|used-products|wholesale-suppliers)
            DIRECTORY="--directory=$arg"
            echo "📁 Processing directory: $arg"
            echo ""
            shift
            ;;
    esac
done

# Create backup directory
BACKUP_DIR="uploads-backup-$(date +%Y%m%d-%H%M%S)"
echo "💾 Creating backup directory: $BACKUP_DIR"

if [ -z "$DRY_RUN" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "✅ Backup directory created"
    echo ""
    echo "⚠️  IMPORTANT: If something goes wrong, you can restore from:"
    echo "   $BACKUP_DIR/"
    echo ""
fi

# Show disk space before
echo "📊 Disk space before optimization:"
df -h . | tail -n 1
echo ""

# Confirmation prompt (skip in dry-run)
if [ -z "$DRY_RUN" ]; then
    read -p "⚠️  This will optimize all images. Continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Optimization cancelled"
        exit 1
    fi
fi

# Run the optimization script
echo ""
echo "🔄 Starting optimization..."
echo ""

node scripts/optimize-existing-images.js $DRY_RUN $DIRECTORY

# Show results
OPTIMIZATION_STATUS=$?

if [ $OPTIMIZATION_STATUS -eq 0 ]; then
    echo ""
    echo "✅ Optimization completed successfully!"
    echo ""
    
    # Show disk space after
    if [ -z "$DRY_RUN" ]; then
        echo "📊 Disk space after optimization:"
        df -h . | tail -n 1
        echo ""
        
        # Check if report exists
        if [ -f "optimization-report.json" ]; then
            echo "📄 Detailed report saved: optimization-report.json"
            echo ""
        fi
        
        echo "💡 Next steps:"
        echo "   1. Test your website to ensure images load correctly"
        echo "   2. Check PageSpeed Insights for performance improvements"
        echo "   3. If everything works, you can delete the backup:"
        echo "      rm -rf $BACKUP_DIR"
        echo ""
    fi
else
    echo ""
    echo "❌ Optimization failed with errors"
    echo ""
    
    if [ -n "$DRY_RUN" ]; then
        echo "💡 This was a dry run. No files were modified."
    else
        echo "⚠️  Some files may have been modified. Check the backup if needed:"
        echo "   $BACKUP_DIR/"
    fi
    echo ""
    exit 1
fi

echo "=================================================="
echo "✅ Process Complete"
echo "=================================================="
