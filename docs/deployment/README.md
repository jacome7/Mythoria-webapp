# Deployment

This section describes how to deploy the Mythoria web application to Google Cloud Run, monitor its health and perform rollbacks.

## Quick Deployment

```bash
./scripts/deploy.sh
```

For Windows PowerShell use `./scripts/deploy.ps1`.

## Manual Steps

1. Build the application:
   ```bash
   npm run build
   ```
2. Submit the build to Google Cloud:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```
3. Deploy to Cloud Run using the generated image.
4. Check the service health:
   ```bash
   curl https://mythoria.pt/api/health
   ```

Environment variables are stored in `.env.production.yaml` and loaded at runtime by Cloud Run.

### Rollback & Recovery

- Use Cloud Run revisions to roll back to a previous container image.
- Monitor logs via Cloud Logging to detect failures.
- Health checks are exposed at `/api/health`.
