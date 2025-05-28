# Mythoria Documentation

Welcome to Mythoria, an interactive story-sharing platform built with Next.js, PostgreSQL, and deployed on Google Cloud Platform.

## 🚀 Quick Start

**New Developer?** → Start with [Development Setup](#development-setup)  
**Deployment?** → See [Deployment Guide](#deployment)  
**API Reference?** → Check [API Documentation](#api-reference)

## 📋 Table of Contents

1. [Development Setup](#development-setup)
2. [Authentication](#authentication)
3. [Database](#database)
4. [API Reference](#api-reference)
5. [Architecture](#architecture)
6. [Deployment](#deployment)
7. [Contributing](#contributing)

---

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Google Cloud SDK (for deployment)

### Local Setup
```bash
# 1. Clone and install
git clone <repository-url>
cd mythoria-webapp
npm install

# 2. Environment setup
copy .env.example .env.local
# Fill in your credentials (see Environment Variables below)

# 3. Database setup
npm run db:push
npm run db:seed

# 4. Start development
npm run dev
```

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mythoria_db_dev
DB_USER=postgres
DB_PASSWORD=your_password

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_your_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
CLERK_WEBHOOK_SIGNING_SECRET=whsec_your_secret
```

---

## Authentication

**System**: Clerk Authentication with custom UI and database sync

### Features
- ✅ Custom-branded sign-in/sign-up pages
- ✅ Mobile-responsive design  
- ✅ Automatic user synchronization with PostgreSQL
- ✅ Protected routes via middleware
- ✅ Webhook-based user management

### Setup Checklist
1. **Clerk Dashboard Configuration**:
   - Set URLs: `/sign-in`, `/sign-up`
   - After auth: `/dashboard`

2. **Webhook Setup (Development)**:
   ```bash
   # Install and start ngrok
   npm install -g ngrok
   ngrok http 3000
   
   # In Clerk Dashboard > Webhooks:
   # URL: https://your-ngrok-url.ngrok.io/api/webhooks
   # Events: user.created, user.updated, user.deleted
   ```

3. **Database Migration**:
   ```bash
   npm run db:push
   ```

---

## Database

**System**: PostgreSQL with Drizzle ORM

### Key Commands
```bash
npm run db:generate    # Generate migrations
npm run db:migrate     # Apply migrations  
npm run db:push        # Push schema (development)
npm run db:seed        # Seed with sample data
```

### Production Connection
- **Provider**: Google Cloud SQL PostgreSQL 17
- **Connection**: Private VPC network
- **Backup**: Automated daily (7-day retention)

---

## API Reference

**Base URLs**:
- Development: `http://localhost:3000/api`
- Production: `https://mythoria.pt/api`

### Authentication
All protected endpoints require Clerk session token:
```http
Authorization: Bearer <clerk_session_token>
```

### Key Endpoints
```
GET    /api/health          # Health check
GET    /api/auth/me         # Current user info
GET    /api/stories         # List stories
POST   /api/stories         # Create story
GET    /api/users           # List users
POST   /api/webhooks        # Clerk user sync
```

### Response Format
```json
{
  "success": boolean,
  "data": object | array | null,
  "error": { "message": string, "code": string } | null,
  "timestamp": string
}
```

---

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: PostgreSQL 17 (Google Cloud SQL)
- **Authentication**: Clerk (managed service)
- **Hosting**: Google Cloud Run
- **CI/CD**: Cloud Build

### Infrastructure (Production)
```
Users → Load Balancer → Cloud Run → Cloud SQL
        (SSL + DNS)     (Container)   (PostgreSQL)
                           ↕
                       Clerk Auth
```

**Domain**: mythoria.pt  
**SSL**: Managed certificates  
**Region**: Europe West 9 (Paris)

---

## Deployment

### Quick Deploy
```bash
# Automated deployment
npm run deploy:production
```

### Manual Process
```bash
# 1. Build and test locally
npm run build
npm run test

# 2. Deploy to Cloud Run
gcloud builds submit --config cloudbuild.yaml

# 3. Verify deployment
curl https://mythoria.pt/api/health
```

### Environment Setup
- **Google Cloud Project**: `oceanic-beach-460916-n5`
- **Region**: `europe-west9`
- **Service**: `mythoria-webapp`

---

## Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/your-feature`
3. **Commit** with clear messages: `feat: add user authentication`
4. **Test** locally: `npm run test && npm run build`
5. **Submit** pull request

### Code Standards
- **Language**: TypeScript strict mode
- **Styling**: Tailwind CSS
- **Formatting**: Prettier + ESLint
- **Testing**: Jest + React Testing Library

### Commit Format
```
type(scope): description

feat: add new feature
fix: bug fix
docs: documentation update
style: formatting changes
refactor: code refactoring
test: add tests
```

---

## Support

- **Issues**: GitHub Issues
- **Questions**: GitHub Discussions
- **Security**: Email security issues privately

---

*Last updated: May 29, 2025*
