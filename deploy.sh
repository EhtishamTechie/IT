#!/bin/bash

# Production Deployment Script
# Run this on the server after pulling changes

echo "🚀 Starting deployment..."

# Navigate to frontend
cd frontend

# Clean Vite cache to prevent build issues
echo "🧹 Cleaning Vite cache..."
rm -rf node_modules/.vite

# Clean previous build
echo "🗑️  Removing old build..."
rm -rf dist

# Install dependencies (in case package.json changed)
echo "📦 Installing dependencies..."
npm install

# Build production bundle
echo "🔨 Building production bundle..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📊 Bundle size:"
    du -sh dist/
    echo ""
    echo "📝 Built files:"
    ls -lh dist/assets/ | grep -E '\.(js|css)$' | tail -10
else
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "🎉 Deployment complete! Please restart your web server."
