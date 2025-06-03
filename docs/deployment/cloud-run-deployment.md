# Cloud Run deployment

The deployment scripts build a Docker image and deploy it to Google Cloud Run. Environment variables are supplied via `.env.production.yaml`.

```
./scripts/deploy.sh        # Linux/macOS
./scripts/deploy.ps1       # Windows
```

Use the `--direct` flag to build locally and deploy without Cloud Build.
