# Development Setup Guide

Quick setup for local Mythoria development environment.

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 15+
- **Google Cloud SDK** (for deployment)
- **Git**

## Quick Setup

```bash
# 1. Clone and install
git clone <repository-url>
cd mythoria-webapp
npm install

# 2. Environment setup
copy .env.example .env.local
```

## Environment Configuration

Edit `.env.local` with your credentials:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mythoria_db_dev
DB_USER=postgres
DB_PASSWORD=your_local_password

# Clerk Authentication (Development)
CLERK_SECRET_KEY=sk_test_your_development_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_development_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
CLERK_WEBHOOK_SIGNING_SECRET=whsec_your_development_secret

# NextAuth (if using)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-development-secret
```

## Database Setup

```bash
# Create local database
createdb mythoria_db_dev

# Apply schema and seed data
npm run db:push
npm run db:seed
```

## Authentication Setup

### Clerk Configuration
1. Create account at [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create new application
3. Copy development keys to `.env.local`
4. Configure URLs:
   - Sign-in: `/sign-in`
   - Sign-up: `/sign-up`
   - After auth: `/dashboard`

### Webhook Setup (Required for user sync)
```bash
# Install ngrok for local development
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# In Clerk Dashboard > Webhooks:
# - URL: https://your-ngrok-url.ngrok.io/api/webhooks
# - Events: user.created, user.updated, user.deleted
# - Copy signing secret to .env.local
```

## Start Development

```bash
# Start development server
npm run dev

# Open in browser
# http://localhost:3000
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run ESLint

# Database commands
npm run db:generate  # Generate migrations
npm run db:migrate   # Apply migrations
npm run db:push      # Push schema (dev only)
npm run db:seed      # Seed with sample data
npm run db:studio    # Open Drizzle Studio
```

## Development Tools

### Recommended VS Code Extensions
- TypeScript
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Auto Rename Tag

### Database Tools
- **Drizzle Studio**: `npm run db:studio`
- **pgAdmin**: GUI for PostgreSQL
- **VS Code PostgreSQL**: Direct DB access

## Troubleshooting

### Common Issues

**Database connection error**:
- Check PostgreSQL is running
- Verify credentials in `.env.local`
- Ensure database exists

**Clerk authentication not working**:
- Verify environment variables
- Check ngrok tunnel is active
- Validate webhook configuration

**Build failures**:
- Clear Next.js cache: `rm -rf .next`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run type-check`

---

*For contribution guidelines, see [contributing.md](./contributing.md)*

## Database Setup

1. **Create local database**
   ```sql
   CREATE DATABASE mythoria_db_dev;
   ```

2. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

3. **Seed the database (optional)**
   ```bash
   npm run db:seed
   ```

## Development Workflow

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Access the application**
   - Local: http://localhost:3000
   - Health check: http://localhost:3000/api/health

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:reset` | Reset database (destructive) |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## Database Management

### Running Migrations
```bash
# Create a new migration
npm run db:migrate

# Generate Prisma client after schema changes
npm run db:generate
```

### Resetting Database
```bash
# WARNING: This will delete all data
npm run db:reset
```

## Code Style and Linting

- **ESLint**: Configured for Next.js and TypeScript
- **Prettier**: Code formatting (auto-format on save recommended)
- **TypeScript**: Strict mode enabled

### VS Code Recommended Extensions
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense

## Debugging

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Check database credentials in `.env.local`
3. Run connection test: `node test-connection.js`

### Authentication Issues
1. Verify Clerk keys are correct
2. Check network connectivity
3. Ensure proper environment variable naming

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `npm run test`
4. Run linting: `npm run lint`
5. Commit with descriptive messages
6. Submit a pull request

## Getting Help

- Check the [API documentation](../api/README.md)
- Review [architecture overview](../architecture/overview.md)
- For deployment issues, see [deployment guide](../deployment/deployment-guide.md)

## Troubleshooting

### Common Issues

**Port 3000 already in use**
```bash
# Kill process using port 3000
npx kill-port 3000
```

**Node modules issues**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Database connection errors**
```bash
# Test database connection
node test-connection.js
```
