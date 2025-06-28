# Mythoria Web App - Development Guide

## Overview

This guide covers setting up a local development environment for the Mythoria Web App, including all necessary tools, dependencies, and configuration for effective development.

## Requirements

### System Requirements
- **Operating System**: Windows 10/11, macOS, or Linux
- **Node.js**: Version 18 or newer (LTS recommended)
- **npm**: Version 8+ (comes with Node.js)
- **Git**: Latest version for version control
- **Visual Studio Code**: Recommended IDE with extensions

### External Services
- **PostgreSQL**: Version 15+ (local installation or cloud instance)
- **Google Cloud SDK**: For deployment and cloud services
- **Clerk Account**: For authentication services
- **OpenAI API**: For AI content generation (optional for basic development)

## Initial Setup

### 1. Repository Setup
```powershell
# Clone the repository
git clone <repository-url>
cd Mythoria/mythoria-webapp

# Install dependencies
npm install

# Verify installation
npm audit
```

### 2. Environment Configuration
```powershell
# Create environment file
cp .env.example .env.local

# Edit environment variables
notepad .env.local  # or your preferred editor
```

### Required Environment Variables
```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/mythoria_dev"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# External Services
NEXT_PUBLIC_SGW_API_URL="http://localhost:8080"
NOTIFICATION_ENGINE_URL="http://localhost:8081"

# Google Cloud (for local AI features)
GOOGLE_CLOUD_PROJECT_ID="oceanic-beach-460916-n5"
GOOGLE_APPLICATION_CREDENTIALS="./service-account-dev.json"

# Optional Development Variables
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
NODE_ENV="development"
NEXT_PUBLIC_FEATURE_FLAGS='{"ai_generation": true, "debug_mode": true}'
```

### 3. Database Setup

#### Local PostgreSQL Installation
```powershell
# Windows (using Chocolatey)
choco install postgresql

# Or download from https://www.postgresql.org/download/

# Start PostgreSQL service
net start postgresql-x64-15

# Create development database
createdb mythoria_dev
```

#### Database Initialization
```powershell
# Generate and apply database schema
npm run db:generate
npm run db:push

# Seed development data
npm run db:seed

# Open database management interface
npm run db:studio
```

### 4. Clerk Authentication Setup

#### Clerk Dashboard Configuration
1. Visit [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application or use existing
3. Configure OAuth providers (Google, GitHub, etc.)
4. Set up webhooks for user synchronization
5. Copy API keys to environment file

#### Webhook Configuration
```bash
# Webhook endpoint for user sync
https://your-local-domain.ngrok.io/api/webhooks/clerk

# Required webhook events
- user.created
- user.updated
- user.deleted
```

### 5. Development Server Startup
```powershell
# Start development server
npm run dev

# Alternative with different port
PORT=3001 npm run dev

# Start with debugging enabled
DEBUG=* npm run dev
```

## Development Workflow

### Code Organization
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages group
│   ├── (dashboard)/       # Dashboard pages group
│   ├── story/             # Story-related pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
│   ├── ui/                # Base UI components
│   ├── forms/             # Form components
│   ├── story/             # Story-specific components
│   └── layout/            # Layout components
├── lib/                   # Utility functions and configurations
│   ├── auth.ts            # Authentication utilities
│   ├── db.ts              # Database connection
│   ├── utils.ts           # General utilities
│   └── validations.ts     # Zod schemas
├── db/                    # Database related files
│   ├── schema.ts          # Drizzle schema definitions
│   ├── migrations/        # Database migrations
│   └── seed.ts           # Database seeding
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── styles/               # Additional stylesheets
```

### Development Scripts
```bash
# Development server
npm run dev              # Start development server with hot reload

# Database operations
npm run db:generate      # Generate new migration files
npm run db:migrate       # Apply migrations to database
npm run db:push          # Push schema changes (development only)
npm run db:studio        # Open Drizzle Studio GUI
npm run db:seed          # Seed database with sample data
npm run db:reset         # Reset database (destructive)

# Code quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run type-check       # Run TypeScript compiler check
npm run format           # Format code with Prettier

# Testing
npm run test             # Run test suite
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate test coverage report

# Build and production
npm run build            # Build for production
npm run start            # Start production server locally
npm run analyze          # Analyze bundle size
```

## Code Quality & Standards

### TypeScript Configuration
The project uses strict TypeScript settings:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true
  }
}
```

### Linting Rules
ESLint configuration includes:
- TypeScript specific rules
- React and Next.js best practices
- Accessibility rules
- Import organization
- Code complexity limits

### Code Formatting
Prettier configuration:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### Commit Standards
Follow Conventional Commits:
```bash
feat: add new story creation flow
fix: resolve authentication redirect issue
docs: update API documentation
style: format components with prettier
refactor: reorganize database utilities
test: add unit tests for story validation
chore: update dependencies
```

## Testing Strategy

### Unit Testing
```typescript
// Example component test
import { render, screen } from '@testing-library/react';
import { StoryCard } from '@/components/story/story-card';

describe('StoryCard', () => {
  it('renders story title correctly', () => {
    render(
      <StoryCard 
        story={{ 
          id: '1', 
          title: 'Test Story',
          status: 'draft' 
        }} 
      />
    );
    
    expect(screen.getByText('Test Story')).toBeInTheDocument();
  });
});
```

### Integration Testing
```typescript
// Example API route test
import { POST } from '@/app/api/stories/route';
import { NextRequest } from 'next/server';

describe('/api/stories', () => {
  it('creates a new story', async () => {
    const request = new NextRequest('http://localhost:3000/api/stories', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Story',
        outline: 'Story outline'
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

### Testing Commands
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test story-card.test.tsx

# Run tests in watch mode during development
npm run test:watch
```

## Database Development

### Schema Management
```typescript
// Example schema definition
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const stories = pgTable('stories', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  outline: text('outline'),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

### Migration Workflow
```bash
# 1. Modify schema in src/db/schema.ts
# 2. Generate migration
npm run db:generate

# 3. Review generated migration
# 4. Apply migration
npm run db:migrate

# 5. For development only - push directly
npm run db:push
```

### Seeding Data
```typescript
// Example seed data
export async function seed() {
  await db.insert(users).values([
    {
      id: '1',
      email: 'user@example.com',
      name: 'Test User'
    }
  ]);

  await db.insert(stories).values([
    {
      title: 'Sample Story',
      outline: 'A sample story for development',
      userId: '1'
    }
  ]);
}
```

## Debugging & Troubleshooting

### Common Development Issues

#### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (Windows)
taskkill /PID <process_id> /F

# Use different port
PORT=3001 npm run dev
```

#### Database Connection Issues
```bash
# Check PostgreSQL service status
net start postgresql-x64-15

# Test database connection
psql -U postgres -h localhost -p 5432 -d mythoria_dev

# Reset database if corrupted
npm run db:reset
npm run db:seed
```

#### Clerk Authentication Issues
```bash
# Check webhook URL is accessible
ngrok http 3000

# Verify environment variables
echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# Clear Clerk cache
rm -rf .next/cache
```

#### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```

### Debugging Tools

#### Next.js Development Tools
- React Developer Tools browser extension
- Next.js built-in error overlay
- Performance profiler in browser DevTools

#### Database Debugging
```bash
# Open Drizzle Studio for visual database management
npm run db:studio

# Enable query logging
DEBUG=drizzle:* npm run dev
```

#### API Debugging
```typescript
// Add logging to API routes
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  logger.info('API request received', { 
    method: request.method, 
    url: request.url 
  });
  
  // ... rest of handler
}
```

## Performance Optimization

### Development Performance
```bash
# Enable Next.js Turbopack (experimental)
npm run dev -- --turbo

# Analyze bundle size
npm run analyze

# Monitor memory usage
node --inspect npm run dev
```

### Code Optimization
- Use dynamic imports for large components
- Implement proper memoization with React.memo
- Optimize database queries with proper indexing
- Use Next.js Image component for image optimization

## Visual Studio Code Setup

### Recommended Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

### Workspace Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

## Deployment Testing

### Local Production Build
```bash
# Build for production
npm run build

# Start production server locally
npm run start

# Test production build
curl http://localhost:3000/api/health
```

### Environment Testing
```bash
# Test with staging environment
cp .env.staging .env.local
npm run dev

# Test with production environment (read-only)
cp .env.production .env.local
npm run dev
```

---

**Last Updated**: June 27, 2025  
**Development Guide Version**: 1.0.0  
**Component Version**: 0.1.1

### 4. Start Development Server
```powershell
npm run dev
```

The application will be available at `http://localhost:3000`.

## Development Workflow

### Database Operations
- **View data**: `npm run db:studio` (opens Drizzle Studio)
- **Generate migrations**: `npm run db:generate`
- **Apply migrations**: `npm run db:migrate`
- **Reset database**: `npm run db:reset`

### Code Quality
- **Linting**: `npm run lint`
- **Type checking**: `npm run type-check`
- **Build verification**: `npm run build`

### Testing
- **Unit tests**: `npm run test`
- **E2E tests**: `npm run test:e2e`
- **Test coverage**: `npm run test:coverage`

## Local Development with External Services

### Clerk Authentication
1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Configure development instance URLs
3. Copy API keys to `.env.local`
4. Set up webhook for user synchronization (see ngrok section)

### PostgreSQL Database
**Option 1: Local PostgreSQL**
```powershell
# Install PostgreSQL (Windows)
# Create database: mythoria
createdb mythoria
```

**Option 2: Cloud SQL**
- Create Cloud SQL PostgreSQL instance
- Configure connection in `.env.local`
- Ensure your IP is allowlisted

### Google Cloud Services
```powershell
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project your-project-id

# Enable required APIs
gcloud services enable aiplatform.googleapis.com
gcloud services enable run.googleapis.com
```

## ngrok Setup for Webhooks

For testing Clerk webhooks locally, use ngrok to expose your development server:

### Installation
```powershell
# Install ngrok
npm install -g ngrok

# Or download from ngrok.com
```

### Usage
```powershell
# Start your dev server
npm run dev

# In another terminal, expose port 3000
ngrok http 3000
```

Copy the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`) and use it in your Clerk webhook configuration:
- Webhook URL: `https://abc123.ngrok.io/api/webhooks`

### Webhook Events to Enable
In Clerk Dashboard → Webhooks:
- `user.created` - New user registration
- `user.updated` - User profile changes
- `user.deleted` - User account deletion
- `session.created` - User login tracking

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API endpoints
│   ├── (auth)/         # Authentication pages
│   └── dashboard/      # Protected pages
├── components/         # Reusable UI components
├── db/                 # Database configuration
│   ├── schema/         # Database schema definitions
│   └── services/       # Database service functions
├── lib/                # Utility functions
├── messages/           # Internationalization files
└── types/              # TypeScript type definitions
```

## Useful Development Commands

### Database Inspection
```powershell
# Open database studio
npm run db:studio

# Check database connection
npm run db:test-connection

# View migration status
npm run db:status
```

### AI Integration Testing
```powershell
# Test Vertex AI connection
npm run test:genai

# Process sample story
npm run test:story-structure
```

### Deployment Testing
```powershell
# Build production version
npm run build

# Test production build locally
npm run start

# Deploy to staging
npm run deploy:staging
```

## Common Development Issues

### Authentication Not Working
- Verify Clerk keys in `.env.local`
- Check if webhook URL is accessible (use ngrok)
- Ensure database user sync is working

### Database Connection Issues
- Verify PostgreSQL is running
- Check connection string format
- Ensure database exists and user has permissions

### Build Failures
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run type-check`

### AI Integration Problems
- Verify Google Cloud authentication: `gcloud auth list`
- Check Vertex AI API is enabled
- Ensure project ID is correct in environment

## Contributing Guidelines

1. **Branch naming**: `feature/description` or `fix/description`
2. **Commit messages**: Follow conventional commits format
3. **Code style**: Use Prettier and ESLint configurations
4. **Testing**: Add tests for new features
5. **Documentation**: Update relevant docs for significant changes
