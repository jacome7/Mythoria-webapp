# Deployment Guide

Mythoria is deployed to Google Cloud Run with automated CI/CD using Cloud Build and secrets managed through Google Secret Manager.

## Prerequisites

- Google Cloud Project with billing enabled
- Clerk application configured
- PostgreSQL database (Cloud SQL recommended)
- Domain configured with SSL certificate

## Environment Setup

### 1. Google Cloud Services
Enable the following APIs in your Google Cloud Console:
- Cloud Run API
- Cloud Build API
- Secret Manager API
- Cloud SQL Admin API
- Vertex AI API

### 2. Secrets Management
All sensitive configuration is stored in Google Secret Manager. Run the setup script:

```powershell
.\scripts\setup-secrets.ps1
```

This creates the following secrets:
- `mythoria-db-host`
- `mythoria-db-user`
- `mythoria-db-password`
- `mythoria-clerk-publishable-key`
- `mythoria-clerk-secret-key`
- `mythoria-clerk-webhook-secret`
- `mythoria-ga-measurement-id`

### 3. Clerk Configuration
In your Clerk Dashboard:

**Domain Settings:**
- Add your production domain (e.g., `mythoria.pt`)
- Set as primary domain
- Configure CORS origins

**Webhook Setup:**
- Create webhook endpoint: `https://your-domain.com/api/webhooks`
- Enable events: `user.created`, `user.updated`, `user.deleted`, `session.created`
- Copy webhook signing secret to Google Secret Manager

## Deployment Process

### Automated Deployment (Recommended)
Deploy using Cloud Build:

```powershell
gcloud builds submit --config cloudbuild.yaml
```

### Manual Deployment
Alternative deployment using the script:

```powershell
.\scripts\deploy.ps1
```

## Build Configuration

### Docker Multi-Stage Build
1. **Dependencies**: Install Node.js packages
2. **Build**: Compile Next.js application with standalone output
3. **Runtime**: Minimal Alpine image with only production dependencies

### Cloud Run Configuration
- **CPU**: 1 vCPU allocated per instance
- **Memory**: 2 GiB per instance
- **Concurrency**: 100 requests per instance
- **Scaling**: 0 to 10 instances (auto-scaling)
- **Region**: europe-west9 (Paris)

### Environment Variables
Runtime secrets are automatically injected from Secret Manager:
- Database connection strings
- Clerk authentication keys
- API tokens and webhook secrets

## Post-Deployment Verification

### 1. Health Check
Verify the service is running:
```powershell
curl https://mythoria.pt/api/health
```

### 2. Authentication Test
Test user authentication flow:
- Sign up/in functionality
- Protected API endpoints
- Database user synchronization

### 3. Database Connectivity
Verify database operations:
- Story creation and retrieval
- Character management
- Payment processing

### 4. AI Integration
Test GenAI story structuring:
- Story outline processing
- Character extraction
- Structured data generation

## Monitoring & Logging

### Cloud Run Logs
Monitor application logs in Google Cloud Console:
- Request/response logs
- Error tracking
- Performance metrics

### Database Monitoring
Monitor PostgreSQL performance:
- Connection pool status
- Query performance
- Storage utilization

### Clerk Dashboard
Monitor authentication metrics:
- User registration rates
- Login success/failure rates
- Webhook delivery status

## Troubleshooting

### Common Issues

**Authentication Problems:**
- Verify Clerk domain configuration
- Check webhook secret in Secret Manager
- Ensure cookies are properly configured

**Database Connection:**
- Verify Cloud SQL instance is running
- Check database credentials in Secret Manager
- Ensure database migrations are applied

**Build Failures:**
- Check Cloud Build logs for specific errors
- Verify all required secrets exist
- Ensure Docker base image is accessible

### Useful Commands

**View logs:**
```powershell
gcloud logs read "resource.type=cloud_run_revision" --limit=50
```

**Check service status:**
```powershell
gcloud run services describe mythoria --region=europe-west9
```

**Rollback deployment:**
```powershell
gcloud run services update-traffic mythoria --to-revisions=PREVIOUS_REVISION=100 --region=europe-west9
```

## Development Tools

### ngrok for Local Testing
For testing webhooks locally:

```powershell
ngrok http 3000
```

Use the ngrok URL in your Clerk webhook configuration during development.

### Database Management
Access database locally:
```powershell
npm run db:studio
```

Apply schema changes:
```powershell
npm run db:push
```
