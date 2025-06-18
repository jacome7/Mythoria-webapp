# Infrastructure & DevOps

Mythoria runs on Google Cloud. The codebase is built into a container image using Cloud Build and deployed to Cloud Run. Secrets are provided via environment variables stored in `.env.production.yaml`.

## Google Cloud Projects

| Codename | Service | Purpose |
|----------|---------|---------|
| `mythoria-prod` | Cloud Run | Hosts the production container |
| `mythoria-build` | Cloud Build | Builds Docker images |
| `mythoria-storage` | Cloud Storage | Stores static assets and deployment artifacts |

## CI/CD Pipeline

1. **Build** – `gcloud builds submit` builds the Docker image using `cloudbuild.yaml`.
2. **Deploy** – Cloud Run receives the new image and rolls out the latest revision.
3. **Secrets** – Environment variables are stored in Secret Manager and mounted via `.env.production.yaml`.

## Cost & Scaling

- Cloud Run scales automatically based on HTTP requests.
- Container concurrency and memory limits can be adjusted in the service settings.
- Billing is tied to the `mythoria-prod` project quota.
