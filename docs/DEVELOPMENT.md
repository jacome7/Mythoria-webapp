# Development Setup

This guide covers setting up a local development environment for Mythoria.

## Requirements

- **Node.js**: Version 18 or newer
- **PostgreSQL**: Version 15+ (local or cloud instance)
- **Google Cloud SDK**: For deployment and cloud services
- **Git**: Version control

## Initial Setup

### 1. Clone and Install
```powershell
git clone <repository-url>
cd mythoria-webapp
npm install
```

### 2. Environment Configuration
Copy the example environment file and configure:
```powershell
cp .env.example .env.local
```

Required environment variables:
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mythoria"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID="your-project-id"

# Optional
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-..."
```

### 3. Database Setup
Initialize and seed the database:
```powershell
npm run db:push      # Apply schema
npm run db:seed      # Insert sample data
```

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
