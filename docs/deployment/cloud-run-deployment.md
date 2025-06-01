# Deployment Guide - Google Cloud Run

This guide explains how to deploy the Mythoria webapp to Google Cloud Run using the recommended approach with environment variables injected at runtime.

## Overview

The deployment has been updated to follow Google Cloud best practices:

- **Container Build**: Docker image is built without hardcoded environment variables
- **Environment Variables**: Injected at runtime using Cloud Run's `--env-vars-file` feature
- **Standalone Output**: Next.js configured with `output: 'standalone'` for optimal Cloud Run performance
- **Flexible Deployment**: Support for both Cloud Build and direct deployment methods

## Files Structure

```
scripts/
├── deploy.sh          # Bash deployment script (Linux/macOS/WSL)
├── deploy.ps1         # PowerShell deployment script (Windows)
├── backup-db.sh       # Database backup script
└── setup-env.sh       # Environment setup script

.env.production        # Environment variables (original format)
.env.production.yaml   # Environment variables (Cloud Run format)
cloudbuild.yaml        # Cloud Build configuration
Dockerfile             # Optimized for Cloud Run
```

## Environment Variables

Environment variables are now managed in two formats:

### `.env.production` (Original)
Used for local development and reference.

### `.env.production.yaml` (Cloud Run)
Used by Cloud Run deployment with the `--env-vars-file` flag.

**Important**: Keep both files in sync when updating environment variables.

## Deployment Methods

### Method 1: Cloud Build (Recommended)

Uses Google Cloud Build service for building and deploying:

**Linux/macOS/WSL:**
```bash
./scripts/deploy.sh
```

**Windows PowerShell:**
```powershell
.\scripts\deploy.ps1
```

### Method 2: Direct Deployment

Builds locally and deploys directly:

**Linux/macOS/WSL:**
```bash
./scripts/deploy.sh --direct
```

**Windows PowerShell:**
```powershell
.\scripts\deploy.ps1 -Direct
```

## Deployment Options

### Available Flags

**Bash Script (`deploy.sh`):**
- `--help` - Show help message
- `--no-build` - Skip build step
- `--staging` - Deploy to staging environment
- `--direct` - Use direct deployment method

**PowerShell Script (`deploy.ps1`):**
- `-Help` - Show help message
- `-NoBuild` - Skip build step
- `-Staging` - Deploy to staging environment
- `-Direct` - Use direct deployment method

### Examples

```bash
# Standard deployment
./scripts/deploy.sh

# Deploy to staging
./scripts/deploy.sh --staging

# Direct deployment (build locally)
./scripts/deploy.sh --direct

# Skip build and deploy existing image
./scripts/deploy.sh --no-build
```

```powershell
# Standard deployment
.\scripts\deploy.ps1

# Deploy to staging
.\scripts\deploy.ps1 -Staging

# Direct deployment (build locally)
.\scripts\deploy.ps1 -Direct

# Skip build and deploy existing image
.\scripts\deploy.ps1 -NoBuild
```

## Prerequisites

1. **Google Cloud CLI**: Installed and authenticated
   ```bash
   gcloud auth login
   gcloud config set project oceanic-beach-460916-n5
   ```

2. **Docker** (for direct deployment only):
   - Docker Desktop (Windows/macOS)
   - Docker Engine (Linux)

3. **Node.js**: For building the application locally

## Configuration

Update these variables in the deployment scripts if needed:

```bash
PROJECT_ID="oceanic-beach-460916-n5"
SERVICE_NAME="mythoria-webapp"
REGION="europe-southwest1"
```

## Cloud Run Features

The deployment includes optimized Cloud Run settings:

- **Memory**: 1Gi
- **CPU**: 1 vCPU
- **Port**: 3000
- **Scaling**: 0-10 instances
- **Platform**: Fully managed
- **Access**: Public (unauthenticated)

## Environment Variable Management

### Adding New Variables

1. Add to `.env.production`:
   ```bash
   NEW_VARIABLE=value
   ```

2. Add to `.env.production.yaml`:
   ```yaml
   NEW_VARIABLE: value
   ```

3. Deploy with updated environment:
   ```bash
   ./scripts/deploy.sh
   ```

### Security Considerations

- **Secrets**: Use Google Secret Manager for sensitive data
- **Database**: Ensure database firewall allows Cloud Run IPs
- **Environment Files**: Keep `.env.production.yaml` secure and don't commit sensitive values

## Troubleshooting

### Common Issues

1. **Authentication Error**:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

2. **Docker Permission Error** (Linux):
   ```bash
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

3. **Build Timeout**:
   - Increase Cloud Build timeout in `cloudbuild.yaml`
   - Use direct deployment for faster builds

4. **Environment Variables Not Loading**:
   - Check `.env.production.yaml` format
   - Ensure all values are quoted if they contain special characters

### Monitoring

- **Cloud Console**: https://console.cloud.google.com/run
- **Logs**: `gcloud logs read --service=mythoria-webapp`
- **Service Details**: `gcloud run services describe mythoria-webapp --region=europe-southwest1`

## Next Steps

1. **CI/CD Pipeline**: Set up automated deployments with GitHub Actions
2. **Custom Domain**: Configure custom domain mapping
3. **SSL Certificate**: Set up managed SSL certificates
4. **Monitoring**: Configure Cloud Monitoring and alerting
5. **Secrets Management**: Migrate sensitive variables to Secret Manager
