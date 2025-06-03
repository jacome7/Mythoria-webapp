#!/usr/bin/env powershell
# Updated Cloud Run deployment script with corrected environment variables

# Build and deploy the application
Write-Host "🔨 Building and deploying Mythoria to Cloud Run..." -ForegroundColor Green

# Build the Docker image
Write-Host "Building Docker image..." -ForegroundColor Yellow
gcloud builds submit --tag gcr.io/oceanic-beach-460916-n5/mythoria-webapp .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

# Deploy to Cloud Run with corrected environment variables
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow

gcloud run deploy mythoria-webapp `
    --image gcr.io/oceanic-beach-460916-n5/mythoria-webapp `
    --platform managed `
    --region europe-west9 `
    --allow-unauthenticated `
    --port 3000 `
    --memory 1Gi `
    --cpu 1 `
    --max-instances 10 `
    --concurrency 80 `
    --timeout 300 `
    --set-env-vars "NODE_ENV=production" `
    --set-env-vars "DB_HOST=10.19.192.3" `
    --set-env-vars "DB_PORT=5432" `
    --set-env-vars "DB_USER=postgres" `
    --set-env-vars "DB_PASSWORD=Mythoria1GCould" `
    --set-env-vars "DB_NAME=mythoria_db" `
    --set-env-vars "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsubXl0aG9yaWEucHQk" `
    --set-env-vars "CLERK_SECRET_KEY=sk_live_8L3AhdA8zaS5FSXSZFcyJDbwlt0F2os7pXmtfNJ6mj" `
    --set-env-vars "CLERK_WEBHOOK_SECRET=whsec_yC4gwWqgOTLRsPwhQMYp5ApvxfL+5lK7" `
    --set-env-vars "NEXT_PUBLIC_CLERK_IS_DEVELOPMENT=false" `
    --set-env-vars "NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in" `
    --set-env-vars "NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up" `
    --set-env-vars "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/" `
    --set-env-vars "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/" `
    --set-env-vars "INITIAL_USER_CREDITS=5" `
    --set-env-vars "NEXT_PUBLIC_SHOW_SOON_PAGE=false" `
    --vpc-connector default-connector `
    --vpc-egress all-traffic

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cloud Run deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 URLs to test:" -ForegroundColor Cyan
Write-Host "   Health Check: https://mythoria.pt/api/health"
Write-Host "   Environment Debug: https://mythoria.pt/api/debug/env"
Write-Host "   Clerk Debug: https://mythoria.pt/clerk-debug"
Write-Host "   Auth Debug: https://mythoria.pt/api/debug/auth"
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Update Clerk Dashboard - Add mythoria.pt as root domain"
Write-Host "   2. Set mythoria.pt as Primary domain in Clerk"
Write-Host "   3. Update webhook endpoint to https://mythoria.pt/api/webhooks"
Write-Host "   4. Test authentication flow"
Write-Host ""
