#!/bin/bash

# Netlify Build Script for College Dispensary
echo "🚀 Starting Netlify build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if build was successful
if [ -d "build" ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build directory created: build/"
    ls -la build/
else
    echo "❌ Build failed - no build directory found"
    exit 1
fi

echo "🎉 Netlify build process completed!"
