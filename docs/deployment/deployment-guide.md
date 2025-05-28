# Deployment Guide

This guide covers deployment procedures for the Mythoria application to Google Cloud Platform.

## Overview

The application is deployed using:
- **Cloud Run** for containerized application hosting
- **Cloud SQL** for PostgreSQL database
- **Cloud Build** for CI/CD pipeline
- **Load Balancer** with SSL termination
- **Cloud DNS** for domain management

## Prerequisites

- Access to Google Cloud Project: `oceanic-beach-460916-n5`
- Google Cloud SDK installed and authenticated
- Docker (for local testing)
- Project environment variables configured

## Production Deployment

### 1. Pre-deployment Checklist

- [ ] All tests passing locally
- [ ] Environment variables updated
- [ ] Database migrations ready
- [ ] SSL certificates active
- [ ] DNS properly configured

### 2. Automated Deployment (Recommended)

```bash
# Deploy using Cloud Build
npm run deploy:production
```

This triggers the `cloudbuild.yaml` configuration which:
1. Builds the Docker container
2. Pushes to Container Registry
3. Deploys to Cloud Run
4. Updates traffic routing

### 3. Manual Deployment

If automated deployment fails:

```bash
# Build and deploy manually
gcloud builds submit --config cloudbuild.yaml

# Or deploy directly to Cloud Run
gcloud run deploy mythoria-webapp \
  --source . \
  --region europe-west9 \
  --allow-unauthenticated \
  --vpc-connector projects/oceanic-beach-460916-n5/locations/europe-west9/connectors/mythoria-connector
```

### 4. Database Migrations

```bash
# Connect to production database (use with caution)
gcloud sql connect mythoria-db --user=postgres

# Run migrations (if not automated)
npm run db:migrate:production
```

## Staging Deployment

### Environment Setup
```bash
# Deploy to staging
npm run deploy:staging
```

Uses `cloudbuild-staging.yaml` configuration for staging environment.

## Environment Variables

### Production Environment Variables
Set these in Cloud Run:

```bash
# Database
DB_HOST=10.19.192.3
DB_PORT=5432
DB_NAME=mythoria_db
DB_USER=postgres
DB_PASSWORD=[PRODUCTION_PASSWORD]

# Authentication
CLERK_SECRET_KEY=[PRODUCTION_CLERK_SECRET]
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[PRODUCTION_CLERK_PUBLIC]
NEXTAUTH_SECRET=[PRODUCTION_NEXTAUTH_SECRET]
NEXTAUTH_URL=https://mythoria.pt

# App URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### Updating Environment Variables

```bash
# Update Cloud Run service with new environment variables
gcloud run services update mythoria-webapp \
  --region europe-west9 \
  --set-env-vars "KEY=VALUE"
```

## SSL Certificate Management

### Check Certificate Status
```bash
gcloud compute ssl-certificates list
```

### Certificate Renewal
SSL certificates are automatically managed by Google Cloud. Monitor status:
- `mythoria-ssl-cert` - Root domain
- `mythoria-ssl-cert-www` - WWW subdomain

## DNS Management

### Current Configuration
- **Domain**: mythoria.pt
- **DNS Zone**: mythoria-pt
- **A Record**: mythoria.pt → 34.160.155.196
- **CNAME**: www.mythoria.pt → mythoria.pt

### Update DNS Records
```bash
# List current records
gcloud dns record-sets list --zone=mythoria-pt

# Add new record (example)
gcloud dns record-sets transaction start --zone=mythoria-pt
gcloud dns record-sets transaction add "new-value" --name="subdomain.mythoria.pt." --type=A --zone=mythoria-pt
gcloud dns record-sets transaction execute --zone=mythoria-pt
```

## Monitoring and Health Checks

### Application Health
- **Health Endpoint**: https://mythoria.pt/api/health
- **Cloud Run Health**: Auto-configured startup probes

### Monitoring Tools
- **Cloud Logging**: Application logs
- **Cloud Monitoring**: Performance metrics
- **Cloud Trace**: Request tracing

### Check Deployment Status
```bash
# Check Cloud Run service status
gcloud run services list --region=europe-west9

# Check recent deployments
gcloud run revisions list --service=mythoria-webapp --region=europe-west9
```

## Rollback Procedures

### Immediate Rollback
```bash
# Rollback to previous revision
gcloud run services update-traffic mythoria-webapp \
  --to-revisions=mythoria-webapp-[PREVIOUS_REVISION]=100 \
  --region=europe-west9
```

### Gradual Rollback
```bash
# Split traffic between versions
gcloud run services update-traffic mythoria-webapp \
  --to-revisions=mythoria-webapp-[OLD_REVISION]=50,mythoria-webapp-[NEW_REVISION]=50 \
  --region=europe-west9
```

## Database Backup and Recovery

### Manual Backup
```bash
# Create on-demand backup
gcloud sql backups create --instance=mythoria-db
```

### Point-in-time Recovery
```bash
# Restore to specific timestamp (creates new instance)
gcloud sql instances clone mythoria-db mythoria-db-recovery \
  --point-in-time="2025-05-28T18:00:00.000Z"
```

## Security Considerations

### Access Control
- Cloud Run service uses managed identity
- Database access restricted to VPC
- Environment variables stored securely

### SSL/TLS
- Automatic HTTPS redirection
- TLS 1.2+ enforced
- Managed certificates auto-renewal

## Cost Optimization

### Resource Scaling
- **Min instances**: 0 (cost-effective)
- **Max instances**: 3 (prevents runaway costs)
- **Memory**: 512Mi (sufficient for current load)
- **CPU**: 1000m (1 vCPU)

### Monitoring Costs
```bash
# Check current billing
gcloud billing budgets list
```

## Troubleshooting

### Common Deployment Issues

**Build Failures**
1. Check build logs: `gcloud builds log [BUILD_ID]`
2. Verify Dockerfile syntax
3. Check dependencies in package.json

**Service Not Responding**
1. Check Cloud Run logs
2. Verify environment variables
3. Test database connectivity

**SSL Certificate Issues**
1. Check certificate status
2. Verify DNS propagation
3. Check domain verification

### Useful Commands

```bash
# View logs
gcloud logs read "resource.type=cloud_run_revision" --limit=50

# Check service configuration
gcloud run services describe mythoria-webapp --region=europe-west9

# List all revisions
gcloud run revisions list --service=mythoria-webapp --region=europe-west9
```

## Support Contacts

- **Primary Developer**: rodrigovieirajacome@gmail.com
- **Google Cloud Project**: oceanic-beach-460916-n5
- **Domain Registrar**: Amen.pt support

For detailed infrastructure information, see [hosting.md](./hosting.md) (restricted access).
