#!/bin/bash

# Re-optimize Failed Images Script
# This script re-runs optimization only on images that failed previously

echo "=================================================="
echo "🔄 Re-optimizing Failed Images"
echo "=================================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if optimization report exists
if [ ! -f "optimization-report.json" ]; then
    echo "❌ Error: optimization-report.json not found"
    echo "   Please run the main optimization script first"
    exit 1
fi

echo "📊 Previous optimization had 342 errors"
echo "   Most were PNG format issues"
echo ""
echo "🔧 Updated script now includes:"
echo "   • PNG corruption repair"
echo "   • Better error handling"
echo "   • Increased pixel limits"
echo ""

# Confirmation prompt
read -p "⚠️  Re-run optimization on failed images? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Optimization cancelled"
    exit 1
fi

echo ""
echo "🔄 Starting re-optimization..."
echo "   This will skip already-optimized images"
echo ""

# Run the optimization script (it will skip images with .webp already)
node scripts/optimize-existing-images.js

OPTIMIZATION_STATUS=$?

if [ $OPTIMIZATION_STATUS -eq 0 ]; then
    echo ""
    echo "✅ Re-optimization completed!"
    echo ""
    echo "📊 Check the updated optimization-report.json for details"
    echo ""
else
    echo ""
    echo "❌ Re-optimization encountered errors"
    echo ""
    exit 1
fi

echo "=================================================="
echo "✅ Process Complete"
echo "=================================================="
