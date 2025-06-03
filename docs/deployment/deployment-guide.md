# Deployment guide

Mythoria is deployed to Google Cloud Run. The project includes scripts in `scripts/` to simplify the process.

## Quick deployment

Run the following command to build and deploy using Cloud Build:

```bash
./scripts/deploy.sh
```

For Windows PowerShell use `./scripts/deploy.ps1`.

## Manual steps

1. Build the application:
   ```bash
   npm run build
   ```
2. Submit the build to Google Cloud:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```
3. Check the service health:
   ```bash
   curl https://mythoria.pt/api/health
   ```

Environment variables are stored in `.env.production.yaml` and loaded at runtime by Cloud Run.
