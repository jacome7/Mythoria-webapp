# Development Setup Guide

This guide will help you set up your local development environment for the Mythoria project.

## Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 15+
- **Google Cloud SDK** (gcloud CLI)
- **Git**

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mythoria-webapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   copy .env.example .env.local
   ```

4. **Configure your `.env.local` file** with:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=mythoria_db_dev
   DB_USER=postgres
   DB_PASSWORD=your_local_password

   # Clerk Authentication (Development Keys)
   CLERK_SECRET_KEY=sk_test_your_development_key
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_development_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-local-development-secret
   ```

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
