# Mythoria Documentation

This directory contains all documentation for the Mythoria web application. Mythoria is a Next.js app running on Google Cloud Run with Clerk authentication and a PostgreSQL database managed via Drizzle ORM.

## Quick start

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and adjust the values.
3. Run database migrations with `npm run db:push` and seed data with `npm run db:seed`.
4. Start the development server using `npm run dev`.

## Documentation index

- **[Development Setup](development/setup.md)** – local environment configuration.
- **[Architecture Overview](architecture/overview.md)** – high level diagram and stack.
- **[Database Schema](database-schema.md)** – tables and relations.
- **[API Reference](api/README.md)** – main REST endpoints.
- **[Deployment Guide](deployment/deployment-guide.md)** – how to deploy to Cloud Run.
- **[Contributing](development/contributing.md)** – guidelines for contributors.
- **[Google Analytics](google-analytics.md)** – analytics integration instructions.

*Last updated: May 2025*
