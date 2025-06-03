# Development setup

This guide explains how to run Mythoria locally.

## Requirements

- Node.js 18 or newer
- PostgreSQL 15+
- Google Cloud SDK (for deployment commands)

## Steps

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # edit .env.local and fill in credentials
   ```
3. **Prepare the database**
   ```bash
   npm run db:push
   npm run db:seed
   ```
4. **Start the development server**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3000`.

## Useful scripts

- `npm run lint` – run ESLint
- `npm run db:generate` – generate migrations
- `npm run db:migrate` – apply pending migrations
- `npm run db:studio` – open Drizzle Studio

For contribution guidelines see [contributing.md](contributing.md).
