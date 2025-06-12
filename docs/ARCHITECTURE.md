# Architecture & Tech Stack

Mythoria is a full-stack React application built with Next.js App Router, combining frontend and backend in a single deployment on Google Cloud Run.

## High-Level Architecture

```
Users → Load Balancer → Cloud Run → PostgreSQL
                 ↕           ↕
               Clerk    Vertex AI (GenAI)
```

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Internationalization**: next-intl for multi-language support

### Backend
- **Runtime**: Node.js 22
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk (session-based auth)
- **AI Integration**: Google Cloud Vertex AI (Gemini 2.5 Pro)

### Infrastructure
- **Hosting**: Google Cloud Run (europe-west9)
- **Database**: Cloud SQL PostgreSQL
- **Build System**: Cloud Build with automated CI/CD
- **Secrets Management**: Google Secret Manager
- **Analytics**: Google Analytics 4

## Key Architectural Decisions

### Authentication Flow
- Clerk handles all user authentication and session management
- Webhook integration syncs user data to local PostgreSQL database
- Session cookies enable seamless authentication across requests

### Data Architecture
- Drizzle ORM provides type-safe database access
- Schema defined in TypeScript with automated migrations
- Relational design linking authors, stories, characters, and payments

### AI Integration
- Google Vertex AI processes story outlines into structured data
- Gemini model converts free-form text into JSON schema
- AI processing happens server-side via dedicated API endpoints

### Deployment Strategy
- Containerized application using Next.js standalone output
- Multi-stage Docker builds for optimized image size
- Automatic scaling from zero instances
- Environment variables managed through Google Secret Manager

## Performance Considerations

- **Image Optimization**: Next.js built-in image optimization
- **Bundle Splitting**: Automatic code splitting with App Router
- **Database Indexing**: Optimized queries with Drizzle relations
- **Caching**: Server-side caching for static content
- **CDN**: Google Cloud CDN for global content delivery

## Security Features

- **Authentication**: Clerk's enterprise-grade security
- **Database**: Parameterized queries prevent SQL injection
- **Secrets**: All sensitive data in Google Secret Manager
- **HTTPS**: Enforced SSL/TLS encryption
- **CORS**: Configured for production domains
