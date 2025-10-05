# Mythoria Web App - Architecture

## Overview

The Mythoria Web App is the frontend component of the Mythoria platform, built as a full-stack Next.js application that combines user interface, API routes, and server-side rendering in a single deployment. It serves as the primary interface for users to create, edit, and manage AI-powered stories.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Users       │───►│  Load Balancer   │───►│  Mythoria       │
│  (Web/Mobile)   │    │  (Cloud Run)     │    │   Web App       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌─────────────────────────────────┼─────────────────┐
                       │                                 │                 │
                       ▼                                 ▼                 ▼
              ┌─────────────────┐              ┌─────────────────┐ ┌──────────────┐
              │     Clerk       │              │   PostgreSQL    │ │    Story     │
              │ Authentication  │              │   Database      │ │  Generation  │
              └─────────────────┘              └─────────────────┘ │  Workflow    │
                                                                   └──────────────┘
```

### Component Architecture

```
mythoria-webapp/
├── Frontend Layer (React/Next.js)
│   ├── Pages & Routing (App Router)
│   ├── UI Components (Tailwind CSS)
│   ├── State Management (React Context)
│   └── Client-Side Logic
│
├── API Layer (Next.js API Routes)
│   ├── Authentication Middleware
│   ├── Route Handlers
│   ├── Validation Logic
│   └── External Service Integration
│
├── Business Logic Layer
│   ├── Story Management
│   ├── User Management
│   ├── AI Integration
│   └── Payment Processing
│
└── Data Layer
    ├── Database Models (Drizzle ORM)
    ├── Database Migrations
    └── Data Access Logic
```

## Technology Stack

### Frontend Technologies

- **Framework**: Next.js 15 with App Router
- **React Version**: React 19 RC
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Custom component library with daisyUI
- **State Management**: React Context API with custom hooks
- **Internationalization**: next-intl for multi-language support
- **Animations**: Framer Motion for smooth interactions

### Backend Technologies

- **Runtime**: Node.js 18+
- **API Framework**: Next.js API Routes with TypeScript
- **Database**: PostgreSQL with connection pooling
- **ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod for schema validation and type inference
- **Authentication**: Clerk for user management and session handling

### Infrastructure & Deployment

- **Hosting Platform**: Google Cloud Run (europe-west9)
- **Database**: Google Cloud SQL PostgreSQL
- **Build System**: Google Cloud Build with automated CI/CD
- **Container Registry**: Google Artifact Registry
- **Secrets Management**: Google Secret Manager
- **Monitoring**: Google Cloud Logging and Monitoring
- **Analytics**: Google Analytics 4

### Development Tools

- **Package Manager**: npm with package-lock.json
- **Linting**: ESLint with TypeScript support
- **Code Formatting**: Prettier with consistent configuration
- **Type Checking**: TypeScript compiler with strict settings
- **Database Tools**: Drizzle Kit for migrations and schema management

## Architectural Patterns

### Clean Architecture Implementation

The application follows clean architecture principles:

1. **Presentation Layer**: React components and Next.js pages
2. **API Layer**: Next.js API routes with middleware
3. **Business Logic**: Domain services and use cases
4. **Data Access**: Repository pattern with Drizzle ORM
5. **Infrastructure**: External service adapters

### Authentication Architecture

```yaml
authentication_flow: 1. User initiates login via Clerk
  2. Clerk handles OAuth/password authentication
  3. JWT token issued and stored in secure cookies
  4. Next.js middleware validates tokens on protected routes
  5. User data synchronized to local database via webhooks
```

### Database Architecture

The application uses a relational database design with the following key entities:

- **Users**: Authentication and profile information
- **Stories**: Main story entities with metadata
- **Story Elements**: Individual components (chapters, characters, settings)
- **AI Generations**: Tracking of AI-generated content
- **User Preferences**: Settings and customizations
- **Usage Tracking**: Analytics and billing information

### API Design Patterns

- **RESTful endpoints**: Standard HTTP methods and status codes
- **Consistent error handling**: Standardized error responses
- **Input validation**: Zod schemas for request validation
- **Authentication middleware**: JWT validation on protected routes
- **Rate limiting**: Protection against abuse and overuse

## Integration Points

### External Service Integrations

#### Clerk Authentication

- **Purpose**: User authentication and session management
- **Integration**: Next.js middleware and React components
- **Data Flow**: User registration/login → Webhook → Local database sync
- **Security**: JWT tokens with secure cookie storage

#### Story Generation Workflow

- **Purpose**: AI-powered story generation and processing
- **Communication**: REST API calls to SGW service
- **Authentication**: Service-to-service JWT tokens
- **Data Exchange**: JSON payloads with story metadata and content

#### Notification Engine

- **Purpose**: User notifications and communications
- **Communication**: REST API calls for notification requests
- **Integration**: Event-driven notifications for story completion
- **Channels**: Email, push notifications, in-app messages

#### Google Cloud Services

- **Cloud Storage**: File uploads and media storage
- **Secret Manager**: Secure configuration management
- **Cloud Logging**: Application logging and monitoring
- **Cloud Monitoring**: Performance metrics and alerting

## Security Architecture

### Authentication & Authorization

- **User Authentication**: Clerk-managed with OAuth and password options
- **Session Management**: Secure JWT tokens with refresh capabilities
- **Role-Based Access**: User, premium, and admin role distinctions
- **API Security**: Bearer token validation on all protected endpoints

### Data Protection

- **Encryption at Rest**: Database encryption via Cloud SQL
- **Encryption in Transit**: HTTPS/TLS for all communications
- **Input Validation**: Comprehensive validation using Zod schemas
- **XSS Protection**: Content Security Policy and input sanitization
- **CSRF Protection**: Next.js built-in CSRF protection

### Infrastructure Security

- **Container Security**: Distroless container images
- **Network Security**: VPC configuration and firewall rules
- **Secrets Management**: Google Secret Manager integration
- **Access Control**: IAM roles and service account authentication

## Performance Considerations

### Frontend Optimization

- **Code Splitting**: Automatic route-based and manual component splitting
- **Image Optimization**: Next.js Image component with WebP conversion
- **Lazy Loading**: Components and images loaded on demand
- **Static Generation**: Pre-rendered pages where applicable
- **Bundle Optimization**: Tree shaking and minification

### Backend Optimization

- **Database Connection Pooling**: Efficient database connection management
- **Query Optimization**: Indexed queries and efficient data fetching
- **Caching Strategy**: API response caching and static asset caching
- **Async Processing**: Non-blocking operations for AI generation

### Infrastructure Optimization

- **Auto Scaling**: Cloud Run automatic scaling based on demand
- **CDN Integration**: Static asset delivery via Cloud CDN
- **Regional Deployment**: Europe-west9 for optimal latency
- **Resource Allocation**: Optimized CPU and memory allocation

## Monitoring & Observability

### Application Monitoring

- **Error Tracking**: Comprehensive error logging and alerting
- **Performance Metrics**: Response times, throughput, and resource usage
- **User Analytics**: Google Analytics 4 for user behavior tracking
- **Custom Metrics**: Business-specific metrics and KPIs

### Infrastructure Monitoring

- **Cloud Run Metrics**: Request count, latency, and error rates
- **Database Monitoring**: Connection pool, query performance, and storage
- **Resource Monitoring**: CPU, memory, and network usage
- **Uptime Monitoring**: Service availability and health checks

### Logging Strategy

- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Log Levels**: Debug, info, warn, error with appropriate filtering
- **Centralized Logging**: Google Cloud Logging aggregation
- **Log Retention**: Configured retention policies for compliance

## Scalability Considerations

### Horizontal Scaling

- **Stateless Design**: No server-side session storage
- **Database Scaling**: Read replicas and connection pooling
- **Service Decomposition**: Microservices architecture preparation
- **Load Distribution**: Load balancing across multiple instances

### Vertical Scaling

- **Resource Optimization**: Efficient memory and CPU usage
- **Database Optimization**: Query optimization and indexing
- **Caching Implementation**: Multi-layer caching strategy
- **Asset Optimization**: Compressed images and optimized bundles

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
