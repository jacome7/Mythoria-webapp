# Google Secret Manager Build Process

This document outlines the updated build and deployment process using Google Secret Manager.

## Setup Required (One-time)

1. **Run the setup-secrets script:**
   ```powershell
   .\scripts\setup-secrets.ps1
   ```
   This creates the following secrets in Google Secret Manager:
   - `mythoria-db-host`
   - `mythoria-db-user` 
   - `mythoria-db-password`
   - `mythoria-clerk-publishable-key`
   - `mythoria-clerk-secret-key`
   - `mythoria-clerk-webhook-secret`
   - `mythoria-ga-measurement-id`

## Deployment

### Option 1: Cloud Build (Recommended)
```powershell
gcloud builds submit --config cloudbuild.yaml
```

### Option 2: Direct deployment script
```powershell
.\scripts\deploy.ps1
```

## Key Improvements

1. **Security**: All sensitive data now stored in Google Secret Manager
2. **Performance**: Using Next.js standalone output for faster Docker builds
3. **Reliability**: Latest Node.js version (22.12-alpine)
4. **Speed**: Multi-stage Docker builds with optimized layers

## Build Process Overview

1. **Step 1**: Retrieve secrets from Secret Manager for build arguments
2. **Step 2**: Build Docker image with secrets as build args
3. **Step 3**: Push image to Google Container Registry
4. **Step 4**: Deploy to Cloud Run with runtime secrets from Secret Manager

## Environment Variables

### Build-time (passed as Docker build args):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (from Secret Manager)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (from Secret Manager)
- `NEXT_PUBLIC_SHOW_SOON_PAGE` (from substitutions)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (from substitutions)
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` (from substitutions)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` (from substitutions)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` (from substitutions)
- `NEXT_PUBLIC_CLERK_IS_DEVELOPMENT` (from substitutions)

### Runtime (passed to Cloud Run):
- `DB_HOST` (from Secret Manager)
- `DB_USER` (from Secret Manager)
- `DB_PASSWORD` (from Secret Manager)
- `CLERK_SECRET_KEY` (from Secret Manager)
- `CLERK_WEBHOOK_SECRET` (from Secret Manager)
- Other non-sensitive variables (from substitutions)

## Troubleshooting

### Update a secret:
```powershell
'NEW_VALUE' | Set-Content -Path temp.txt -NoNewline; gcloud secrets versions add SECRET_NAME --data-file=temp.txt; Remove-Item temp.txt
```

### List all secrets:
```powershell
gcloud secrets list
```

### Fix newline issues in secrets:
If secrets have trailing newline characters (causing connection issues), run:
```powershell
.\scripts\fix-secrets.ps1
```

### View build logs:
```powershell
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### Direct deployment if Cloud Build fails:
```powershell
.\scripts\deploy.ps1 -Direct
```
