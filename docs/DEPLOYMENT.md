# Mythoria Web App - Deployment Guide

## Overview

This guide covers deploying the Mythoria Web App to Google Cloud Platform using Cloud Run. The deployment process includes container building, environment configuration, and service deployment with automated CI/CD pipelines.

## Prerequisites

### Required Tools

- **Google Cloud SDK**: Latest version with authentication
- **Docker**: For local container building and testing
- **Node.js**: Version 18+ for local development
- **Git**: Version control access to the repository

### Google Cloud Setup

- **Project ID**: `oceanic-beach-460916-n5`
- **Region**: `europe-west9` (Paris)
- **Service Account**: Configured with necessary permissions
- **APIs Enabled**: Cloud Run, Cloud Build, Secret Manager, Cloud SQL

### Required Permissions

```bash
# Enable required Google Cloud APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## Environment Configuration

### Production Environment Variables

```yaml
# Database Configuration
DATABASE_URL: 'postgresql://username:password@host:port/database'
DB_HOST: '10.94.208.3' # Cloud SQL private IP
DB_PORT: '5432'
DB_NAME: 'mythoria_production'
DB_USER: 'mythoria_user'

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_...'
CLERK_SECRET_KEY: 'sk_live_...'
CLERK_WEBHOOK_SECRET: 'whsec_...'

# External Services
NEXT_PUBLIC_SGW_API_URL: 'https://story-generation-workflow-803421888801.europe-west9.run.app'
NOTIFICATION_ENGINE_URL: 'https://notification-engine-803421888801.europe-west9.run.app'

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID: 'oceanic-beach-460916-n5'
GOOGLE_APPLICATION_CREDENTIALS: '/app/service-account-key.json'

# Analytics & Monitoring
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: 'G-XXXXXXXXXX'
SENTRY_DSN: 'https://...'

# Feature Flags
NEXT_PUBLIC_FEATURE_FLAGS: '{"ai_generation": true, "audiobooks": true}'

# Security
NEXTAUTH_SECRET: 'your-secret-key'
NEXTAUTH_URL: 'https://app.mythoria.com'
```

## Google Secret Manager Configuration

### Storing Secrets

```bash
# Database credentials
gcloud secrets create mythoria-webapp-database-url --data-file=db-url.txt

# Clerk authentication
gcloud secrets create mythoria-webapp-clerk-secret --data-file=clerk-secret.txt

# Service account key
gcloud secrets create mythoria-webapp-service-account --data-file=service-account.json
```

## Container Configuration

### Dockerfile

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

## Cloud Run Deployment

### Deployment Commands

```bash
# Deploy to Cloud Run
gcloud run deploy mythoria-webapp \
  --image europe-west9-docker.pkg.dev/oceanic-beach-460916-n5/mythoria/mythoria-webapp:latest \
  --region europe-west9 \
  --platform managed \
  --allow-unauthenticated \
  --service-account mythoria-webapp-sa@oceanic-beach-460916-n5.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=mythoria-webapp-database-url:latest \
  --set-secrets CLERK_SECRET_KEY=mythoria-webapp-clerk-secret:latest \
  --memory 4Gi \
  --cpu 2 \
  --max-instances 100 \
  --min-instances 1 \
  --timeout 300
```

## CI/CD Pipeline

### Cloud Build Configuration

```yaml
# cloudbuild.yaml
steps:
  # Build dependencies
  - name: 'node:18'
    entrypoint: npm
    args: ['ci']

  # Run tests
  - name: 'node:18'
    entrypoint: npm
    args: ['run', 'test']

  # Build Next.js application
  - name: 'node:18'
    entrypoint: npm
    args: ['run', 'build']

  # Build container image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      [
        'build',
        '-t',
        'europe-west9-docker.pkg.dev/${PROJECT_ID}/mythoria/mythoria-webapp:${COMMIT_SHA}',
        '-t',
        'europe-west9-docker.pkg.dev/${PROJECT_ID}/mythoria/mythoria-webapp:latest',
        '.',
      ]

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      [
        'run',
        'deploy',
        'mythoria-webapp',
        '--image',
        'europe-west9-docker.pkg.dev/${PROJECT_ID}/mythoria/mythoria-webapp:${COMMIT_SHA}',
        '--region',
        'europe-west9',
        '--platform',
        'managed',
        '--allow-unauthenticated',
      ]
```

## Monitoring & Troubleshooting

### Health Checks

```typescript
// pages/api/health.ts
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
  };

  res.status(200).json(health);
}
```

### Common Issues

#### Deployment Failures

```bash
# Check build logs
gcloud builds list --limit 10
gcloud builds log [BUILD_ID]

# Check service status
gcloud run services describe mythoria-webapp --region europe-west9
```

#### Database Connection Issues

```bash
# Test database connectivity
gcloud sql connect mythoria-postgres --user mythoria_user
```

### Recovery Procedures

```bash
# Rollback to previous version
gcloud run services update mythoria-webapp \
  --image europe-west9-docker.pkg.dev/oceanic-beach-460916-n5/mythoria/mythoria-webapp:previous-tag \
  --region europe-west9
```

---

**Last Updated**: June 27, 2025  
**Deployment Version**: 1.0.0  
**Component Version**: 0.1.1
