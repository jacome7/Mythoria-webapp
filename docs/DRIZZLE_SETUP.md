# Drizzle ORM Setup for Google Cloud Postgres

## Overview

This project uses Drizzle ORM to connect to a Google Cloud Postgres database. Drizzle ORM is a TypeScript-first ORM that provides excellent type safety and performance.

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in your Google Cloud Postgres credentials:

```bash
cp .env.example .env.local
```

Update the following variables in `.env.local`:
- `DB_HOST`: Your Google Cloud Postgres instance connection name or IP
- `DB_PORT`: Usually 5432 for Postgres
- `DB_USER`: Your database username
- `DB_PASSWORD`: Your database password
- `DB_NAME`: Your database name

### 2. Google Cloud Postgres Connection

For Google Cloud SQL, you have several connection options:

#### Option A: Public IP with SSL
- Enable public IP on your Cloud SQL instance
- Download the SSL certificates from Google Cloud Console
- Set `ssl: true` in the connection config

#### Option B: Private IP (recommended for production)
- Use VPC peering or Private Service Connect
- Connect from within the same VPC network

#### Option C: Cloud SQL Proxy
- Install and run the Cloud SQL Proxy locally
- Connect through the proxy on localhost

### 3. Database Commands

```bash
# Generate migration files from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Push schema directly to database (development only)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### 4. Initial Setup

1. Create your database tables:
```bash
npm run db:push
```

2. Start the development server:
```bash
npm run dev
```

### 5. API Endpoints

- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `GET /api/stories` - Get published stories
- `POST /api/stories` - Create a new story

## Database Schema

The current schema includes:
- **users**: User accounts
- **stories**: Story content
- **characters**: Characters within stories

You can modify the schema in `src/db/schema.ts` and generate migrations with `npm run db:generate`.

## File Structure

```
src/
  db/
    index.ts        # Database connection
    schema.ts       # Database schema definitions
    services.ts     # Database operations
  app/
    api/
      users/
        route.ts    # User API endpoints
      stories/
        route.ts    # Story API endpoints
drizzle.config.ts   # Drizzle configuration
```

## Best Practices

1. Always use migrations for production deployments
2. Use `db:push` only for development
3. Keep your environment variables secure
4. Use connection pooling for better performance
5. Implement proper error handling in your API routes

## Troubleshooting

### Connection Issues
- Verify your credentials in `.env.local`
- Check if your IP is whitelisted in Google Cloud Console
- Ensure SSL settings match your Cloud SQL configuration

### Migration Issues
- Make sure your database is accessible
- Check the `drizzle.config.ts` configuration
- Verify the schema syntax in `schema.ts`
