# AGENT INSTRUCTIONS

This repository contains the **Mythoria** web application. It is a TypeScript/Next.js project targeting Node.js 18 and deployed to Google Cloud Run. Use this guide when contributing as an automated agent.

## Project Overview
- **Frameworks**: Next.js (App Router), React 19, Tailwind CSS via `daisyui`.
- **Backend**: Next.js API routes with PostgreSQL accessed through Drizzle ORM.
- **Auth**: NextAuthJS.
- **Docs**: See `docs/README.md` for an index of documentation covering development setup, deployment and architecture.

## Key Directories
- `src/` – application source code (Next.js `app/` directory, components, database logic in `db/`, utilities in `lib/`).
- `drizzle/` – database schema and migrations.
- `scripts/` – helper scripts for deployment and testing.
- `docs/` – extensive project documentation and setup guides.
- `config/` – helper modules for environment/database configuration.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file based on project documentation (variables such as database credentials and Clerk keys are required). An example production file lives at `.env.production`.
3. Prepare the database (optional):
   ```bash
   npm run db:push
   npm run db:seed
   ```
4. Start the development server with `npm run dev`.

## Linting and Tests
- Run ESLint before committing:
  ```bash
  npm run lint
  ```
- The project currently has **no automated test suite**. Linting must pass.

## Build & Deployment
- Build the application with `npm run build`.
- Deployment to Google Cloud Run is handled via scripts under `scripts/` (see `docs/deployment/`).

## Contributing Guidelines
- Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
- Use TypeScript strict mode; avoid `any`.
- Prefer functional React components and Tailwind CSS for styling.

---
Following these instructions ensures compatibility with the existing project structure and tooling. For more details see the documentation within the `docs/` directory.