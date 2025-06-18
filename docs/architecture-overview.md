# Architecture Overview

The application is built with Next.js using the App Router. It serves both the frontend React components and backend API routes. Data is stored in a PostgreSQL database accessed through Drizzle ORM, while authentication is handled with NextAuth.js.

```mermaid
flowchart TD
    A[User] -->|HTTPS| B(Mythoria Web App)
    B --> C{Next.js Server}
    C --> D[API Routes]
    C --> E[React UI]
    D --> F[(PostgreSQL)]
    C --> G[Authentication\nNextAuth]
```

The system is packaged as a Docker container and deployed to Google Cloud Run.
