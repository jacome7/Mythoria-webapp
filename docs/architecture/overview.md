# Architecture overview

Mythoria is a React application built with the Next.js App Router. The backend and frontend are combined in a single project and deployed to Google Cloud Run.

```
Users → Load Balancer → Cloud Run → PostgreSQL
                 ↕
                Clerk
```

## Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Authentication**: Clerk
- **Database**: PostgreSQL managed with Drizzle ORM
- **Hosting**: Google Cloud Run in `europe-west9`
- **CI/CD**: Cloud Build triggered by pushes to `main`

## Key features

- Automatic scaling from zero instances
- Secure cookie-based authentication with Clerk
- REST style API routes under `/api`
- Database migrations and types generated with Drizzle

For deployment details see [Deployment Guide](../deployment/deployment-guide.md).
