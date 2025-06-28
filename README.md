# Mythoria Web App

## Overview

The Mythoria Web App is the user-facing frontend of the Mythoria platform, built with Next.js 15. It provides an intuitive interface for creating, editing, and managing AI-powered personalized stories. Users can craft unique narratives featuring themselves or loved ones as protagonists, with AI-generated content including text, images, and audio narration.

## Features

### Story Creation & Management
- **Interactive Story Builder**: Step-by-step guided story creation process
- **Character Customization**: Define protagonists with photos, descriptions, and personality traits
- **Setting Selection**: Choose from 20+ pre-defined story environments (castles, space, underwater, etc.)
- **AI-Powered Generation**: Leverage advanced AI for story outlines, chapters, and illustrations
- **Real-time Editing**: Manual editing capabilities with AI assistance

### User Experience
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Multi-language Support**: Internationalization ready with translation infrastructure
- **User Authentication**: Secure authentication and profile management via Clerk
- **Story Library**: Personal collection of created stories with organization features

### Content Formats
- **Digital Reading**: In-app story reader with enhanced typography
- **PDF Export**: Professional PDF generation for printing
- **Audiobook Creation**: AI-narrated audio versions with chapter navigation
- **Sharing Features**: Share stories with family and friends

### AI Integration
- **Smart Content Generation**: Integration with Story Generation Workflow service
- **Image Enhancement**: AI-powered image editing and generation
- **Audio Narration**: Text-to-speech with multiple voice options
- **Content Optimization**: AI-driven content improvements and suggestions

## Technology Stack

### Frontend Technologies
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript for type safety and better development experience
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Custom component library with accessibility features
- **Animations**: Framer Motion for smooth interactions
- **State Management**: React Context API with custom hooks

### Authentication & Security
- **Authentication**: Clerk for secure user management
- **Authorization**: Role-based access control
- **Security**: CSP headers, secure cookies, and input validation

### Database & API
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (shared with other services)
- **API Layer**: Next.js API Routes with RESTful endpoints
- **Validation**: Zod for schema validation

### Development Tools
- **Linting**: ESLint with TypeScript support
- **Code Formatting**: Prettier with consistent configuration
- **Testing**: Jest and React Testing Library
- **Type Checking**: TypeScript strict mode

### Analytics & Monitoring
- **Analytics**: Google Analytics 4 for user behavior tracking
- **Error Tracking**: Sentry for error monitoring and performance tracking
- **Performance**: Next.js built-in performance optimization

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database access
- Clerk account for authentication
- Environment variables configured

### Installation

1. **Clone and navigate to the web app**:
   ```bash
   git clone <repository-url>
   cd Mythoria/mythoria-webapp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   # Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/mythoria
   
   # API URLs
   NEXT_PUBLIC_SGW_API_URL=http://localhost:8080
   
   # Optional
   NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your_ga_id
   SENTRY_DSN=your_sentry_dsn
   ```

4. **Set up the database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser** and navigate to `http://localhost:3000`

### Development Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run lint:fix        # Fix linting issues

# Database
npm run db:generate     # Generate Drizzle migrations
npm run db:migrate      # Run database migrations
npm run db:push         # Push schema changes to database
npm run db:studio       # Open Drizzle Studio
npm run db:seed         # Seed database with initial data
npm run db:reset        # Reset database (use with caution)

# Testing
npm run test            # Run test suite
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report

# Deployment
npm run deploy:staging     # Deploy to staging environment
npm run deploy:production  # Deploy to production environment
```

## Project Structure

```
mythoria-webapp/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # User dashboard
│   │   ├── story/             # Story-related pages
│   │   └── api/               # API routes
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # Base UI components
│   │   ├── forms/             # Form components
│   │   └── story/             # Story-specific components
│   ├── lib/                   # Utility functions and configurations
│   │   ├── auth.ts            # Authentication utilities
│   │   ├── db.ts              # Database configuration
│   │   └── utils.ts           # General utilities
│   ├── db/                    # Database schemas and operations
│   │   ├── schema.ts          # Drizzle schema definitions
│   │   └── migrations/        # Database migrations
│   ├── hooks/                 # Custom React hooks
│   ├── styles/                # Global styles and Tailwind config
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
├── docs/                      # Component documentation
└── config files               # Next.js, TypeScript, etc.
```

## Documentation

### Detailed Guides
- **[Architecture](./docs/architecture.md)** - Application architecture and design patterns
- **[Development](./docs/development.md)** - Development workflow and guidelines
- **[Deployment](./docs/deployment.md)** - Deployment and infrastructure setup
- **[API Reference](./docs/api-reference.md)** - API endpoints and usage
- **[Features](./docs/features.md)** - Detailed feature documentation

### Additional Resources
- **[Contributing](../CONTRIBUTING.md)** - How to contribute to the project
- **[Agents Documentation](./AGENTS.md)** - AI-readable technical specifications

## Environment Variables

### Required Variables
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk authentication public key
- `CLERK_SECRET_KEY`: Clerk authentication secret key
- `DATABASE_URL`: PostgreSQL connection string
- `NEXT_PUBLIC_SGW_API_URL`: Story Generation Workflow service URL

### Optional Variables
- `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`: Google Analytics tracking ID
- `SENTRY_DSN`: Sentry error tracking DSN
- `NEXT_PUBLIC_FEATURE_FLAGS`: Feature flag configuration

## Integration with Other Services

### Story Generation Workflow
The web app communicates with the SGW service for:
- Story generation requests
- AI content processing
- Image generation and editing
- Audio narration creation

### Notification Engine
Integration for:
- User notification preferences
- Story completion alerts
- System notifications

## Performance Optimization

### Next.js Optimizations
- **Image Optimization**: Automatic image optimization and lazy loading
- **Code Splitting**: Automatic code splitting for optimal bundle sizes
- **Static Generation**: Pre-rendered pages for better performance
- **Caching**: Intelligent caching strategies for API responses

### Custom Optimizations
- **Database Query Optimization**: Efficient database queries with indexing
- **Asset Optimization**: Compressed images and optimized fonts
- **Bundle Analysis**: Regular bundle size monitoring and optimization

## Troubleshooting

### Common Issues

1. **Authentication Issues**
   - Verify Clerk keys are correctly configured
   - Check environment variable names match exactly
   - Ensure Clerk domain settings are correct

2. **Database Connection Issues**
   - Verify DATABASE_URL format and credentials
   - Check PostgreSQL service is running
   - Ensure database exists and migrations are applied

3. **API Communication Issues**
   - Check SGW service is running
   - Verify API URLs are correct
   - Review network connectivity and firewall settings

For more troubleshooting information, see the [Development Guide](./docs/development.md#troubleshooting).

## Contributing

We welcome contributions! Please see our [Contributing Guide](../CONTRIBUTING.md) for details on:
- Setting up the development environment
- Code style guidelines
- Testing requirements
- Pull request process

## License

This project is part of the Mythoria platform and is licensed under the terms specified in the [LICENSE](../LICENSE) file.

---

**Version**: 0.1.1  
**Last Updated**: June 27, 2025  
**Next.js Version**: 15.x  
**Node.js Version**: 18+