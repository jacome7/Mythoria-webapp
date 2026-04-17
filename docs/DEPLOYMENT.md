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

The canonical source of truth is [`env.manifest.ts`](/C:/Mythoria/mythoria-webapp/env.manifest.ts). Production deployment must keep Cloud Build substitutions, Cloud Run runtime env vars, Docker build args, and Secret Manager bindings aligned with that manifest.

```yaml
# Public/build configuration
NEXT_PUBLIC_BASE_URL: 'https://mythoria.pt'
NEXT_PUBLIC_SUPPORTED_LOCALES: 'en-US,pt-PT,es-ES,fr-FR,de-DE'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_...'
NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-XXXXXXXXXX'
NEXT_PUBLIC_GOOGLE_ADS_ID: 'AW-...'
NEXT_PUBLIC_GOOGLE_TAG_ID: 'GT-...'
NEXT_PUBLIC_REVOLUT_API_PUBLIC_KEY: 'pk_live_...'
NEXT_PUBLIC_TTS_PROVIDER: 'openai'
NEXT_PUBLIC_DEFAULT_CURRENCY: 'EUR'
NEXT_PUBLIC_APP_DOMAIN: 'mythoria.pt'

# Runtime web / auth
CLERK_SECRET_KEY: 'sk_live_...'
CLERK_WEBHOOK_SECRET: 'whsec_...'
CLERK_OAUTH_CLIENT_ID: '...'
CLERK_OAUTH_CLIENT_SECRET: '...'
CLERK_SIGN_IN_URL: '/sign-in'
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: '/my-stories'
CLERK_SIGN_UP_URL: '/sign-up'
CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: '/profile/onboarding'
CLERK_SIGN_UP_FORCE_REDIRECT_URL: '/profile/onboarding'
MCP_AUTHORIZATION_SERVER_URL: 'https://clerk.mythoria.pt'
MCP_RESOURCE_URL: 'https://mythoria.pt/api/mcp'
MCP_WIDGET_DOMAIN: 'https://mythoria.pt'
MCP_AUTH_ALLOW_SESSION_TOKEN: 'false'
NEXTAUTH_URL: 'https://mythoria.pt'

# Data / storage / messaging
DB_HOST: '10.x.x.x'
DB_PORT: '5432'
DB_NAME: 'mythoria_db'
DB_USER: '...'
DB_PASSWORD: '...'
GOOGLE_CLOUD_PROJECT_ID: 'oceanic-beach-460916-n5'
GOOGLE_CLOUD_LOCATION: 'europe-west9'
MODEL_ID: 'gemini-2.5-pro'
PUBSUB_TOPIC: 'mythoria-story-requests'
PUBSUB_AUDIOBOOK_TOPIC: 'mythoria-audiobook-requests'
STORAGE_BUCKET_NAME: 'mythoria-generated-stories'
PUBLIC_STORAGE_BUCKET_NAME: 'mythoria-public'

# External services
STORY_GENERATION_WORKFLOW_URL: 'https://story-generation-workflow-...run.app'
STORY_GENERATION_WORKFLOW_API_KEY: '...'
SGW_WEBHOOK_SECRET: '...'
ADMIN_API_URL: 'https://mythoria-admin-...run.app'
ADMIN_API_KEY: '...'
NOTIFICATION_ENGINE_URL: 'https://notification-engine-...run.app'
NOTIFICATION_ENGINE_API_KEY: '...'
REVOLUT_API_URL: 'https://merchant.revolut.com'
REVOLUT_API_SECRET_KEY: '...'
REVOLUT_WEBHOOK_SECRET: '...'
GOOGLE_ANALYTICS_API_SECRET: '...'
LEAD_BOUNCE_API_SECRET: '...'
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
  --set-env-vars '^|^NODE_ENV=production|NEXT_PUBLIC_SUPPORTED_LOCALES=en-US,pt-PT,es-ES,fr-FR,de-DE' \
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
