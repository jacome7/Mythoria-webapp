#!/usr/bin/env powershell
# Local testing script for the Clerk fixes

Write-Host "🧪 Testing Clerk Configuration Locally..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Run this script from the mythoria-webapp directory" -ForegroundColor Red
    exit 1
}

# Build the application
Write-Host "📦 Building application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Start the application in development mode for testing
Write-Host "🚀 Starting application for testing..." -ForegroundColor Yellow
Write-Host "   The application will start on http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 Test URLs to check:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000/api/health"
Write-Host "   http://localhost:3000/api/debug/env"
Write-Host "   http://localhost:3000/clerk-debug"
Write-Host "   http://localhost:3000/api/debug/auth"
Write-Host ""
Write-Host "📋 What to verify:" -ForegroundColor Yellow
Write-Host "   1. Build completes without errors"
Write-Host "   2. Debug pages load correctly"
Write-Host "   3. Environment variables are properly configured"
Write-Host "   4. No TypeScript or ESLint errors"
Write-Host ""
Write-Host "Press Ctrl+C to stop the server when done testing" -ForegroundColor Gray
Write-Host ""

# Start the development server
npm run dev
