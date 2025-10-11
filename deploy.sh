#!/bin/bash

# College Dispensary - Netlify Deployment Script
echo "🚀 Starting deployment to Netlify..."

# Check if we're in the right directory
if [ ! -f "client/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd client
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Error: Build failed. No build directory found."
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📁 Build directory created: client/build"

# Instructions for Netlify deployment
echo ""
echo "🌐 Netlify Deployment Instructions:"
echo "1. Go to https://netlify.com"
echo "2. Sign in to your account"
echo "3. Click 'New site from Git'"
echo "4. Connect your GitHub repository"
echo "5. Set the following build settings:"
echo "   - Build command: npm run build"
echo "   - Publish directory: client/build"
echo "   - Base directory: client"
echo "6. Click 'Deploy site'"
echo ""
echo "📋 Alternative: Manual deployment"
echo "1. Go to https://netlify.com"
echo "2. Drag and drop the 'client/build' folder"
echo "3. Your site will be deployed automatically"
echo ""
echo "🎉 Deployment ready!"
