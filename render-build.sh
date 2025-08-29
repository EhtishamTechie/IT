#!/bin/bash

# Render.com Build Script
echo "🚀 Building International Tijarat for Render..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production

# Create logs directory
mkdir -p logs

echo "✅ Build completed successfully!"
echo "🌐 Starting server..."
