# Mythoria Web App - AI Agent Documentation

## Component Metadata
```yaml
name: mythoria-webapp
version: 0.1.1
type: frontend-application
framework: nextjs
language: typescript
port: 3000
architecture: server-side-rendered
deployment: cloud-run
target_runtime: nodejs-18
```

## Technical Specifications

### Framework Configuration
```yaml
nextjs:
  version: 15.x
  router: app-router
  rendering: hybrid-ssr-ssg
  features: [image-optimization, internationalization, api-routes]
  
typescript:
  version: 5.x
  strict_mode: true
  path_mapping: true
  
styling:
  framework: tailwindcss
  ui_library: daisyui
  approach: utility-first
  components: custom-design-system
  responsive: mobile-first
```

## Project Structure

### Key Directories
```yaml
directories:
  src/: application source code (Next.js app directory, components, database logic)
  drizzle/: database schema and migrations
  scripts/: helper scripts for deployment and testing
  docs/: extensive project documentation and setup guides
  config/: helper modules for environment/database configuration
  public/: static assets and files
```

### Component Architecture
```yaml
component_structure:
  pages:
    - /: landing page
    - /dashboard: user dashboard
    - /story/create: story creation wizard
    - /story/[id]: story editor
    - /story/[id]/read: story reader
    - /profile: user profile management
    
  layouts:
    - RootLayout: global layout with providers
    - DashboardLayout: authenticated user layout
    - StoryLayout: story-specific layout
    
  components:
    ui: [Button, Input, Modal, Card, Spinner, Alert]
    forms: [StoryForm, ProfileForm, PreferencesForm]
    story: [StoryEditor, ChapterEditor, ImageUploader, AudioPlayer]
    navigation: [Header, Sidebar, Breadcrumbs]
```

## Database Integration
```yaml
database:
  orm: drizzle
  database: postgresql
  connection_pooling: true
  migrations: version-controlled
  
schemas:
  users: [id, clerk_user_id, email, name, created_at, updated_at]
  stories: [id, user_id, title, status, outline, created_at, updated_at]
  story_elements: [id, story_id, type, content, sequence_order, ai_generated]
  user_preferences: [id, user_id, language, theme, notification_settings]
```

## API Endpoints

### Internal API Routes
```yaml
api_routes:
  stories:
    - GET /api/stories: list user stories
    - POST /api/stories: create new story
    - GET /api/stories/[id]: get story details
    - PUT /api/stories/[id]: update story
    - DELETE /api/stories/[id]: delete story
    
  story_elements:
    - GET /api/stories/[id]/elements: get story elements
    - POST /api/stories/[id]/elements: create story element
    - PUT /api/stories/[id]/elements/[elementId]: update element
    - DELETE /api/stories/[id]/elements/[elementId]: delete element
    
  ai_generation:
    - POST /api/ai/generate-outline: generate story outline
    - POST /api/ai/generate-chapter: generate story chapter
    - POST /api/ai/enhance-text: enhance existing text
    - POST /api/ai/generate-image: request image generation
    
  user_management:
    - GET /api/user/profile: get user profile
    - PUT /api/user/profile: update user profile
    - GET /api/user/preferences: get user preferences
    - PUT /api/user/preferences: update preferences
```

### External Service Communication
```yaml
external_services:
  story_generation_workflow:
    base_url: ${NEXT_PUBLIC_SGW_API_URL}
    endpoints:
      - POST /api/stories/generate: full story generation
      - POST /api/ai/text/generate: text generation
      - POST /api/ai/image/generate: image generation
      - POST /api/ai/audio/generate: audio generation
      - GET /api/stories/[id]/status: generation status
    authentication: jwt-bearer-token
    
  notification_engine:
    base_url: ${NOTIFICATION_ENGINE_URL}
    endpoints:
      - POST /api/notifications/send: send notification
      - GET /api/notifications/preferences: user preferences
    authentication: service-token
```

## Authentication & Authorization
```yaml
authentication:
  provider: clerk
  method: jwt
  middleware: next-auth-middleware
  
  protected_routes:
    - /dashboard/*
    - /story/*
    - /profile/*
    - /api/stories/*
    - /api/user/*
    
authorization:
  roles: [user, premium, admin]
  permissions:
    user: [create_stories, edit_own_stories, export_stories]
    premium: [unlimited_stories, priority_generation, advanced_features]
    admin: [manage_users, system_configuration, analytics_access]
```

## Environment Configuration
```yaml
environment_variables:
  required:
    - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerk authentication
    - CLERK_SECRET_KEY: clerk server-side operations
    - DATABASE_URL: postgresql connection string
    - NEXT_PUBLIC_SGW_API_URL: story generation service url
    
  optional:
    - NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: analytics tracking
    - SENTRY_DSN: error tracking
    - NEXT_PUBLIC_FEATURE_FLAGS: feature toggles
    - UPLOADTHING_SECRET: file upload service
    - UPLOADTHING_APP_ID: file upload app id
```

## Development Workflow
```yaml
setup_commands:
  install_dependencies: npm install
  setup_environment: cp .env.example .env.local
  database_setup: 
    - npm run db:push
    - npm run db:seed
  start_development: npm run dev
  
code_quality:
  linting: npm run lint
  type_checking: typescript strict mode
  formatting: prettier
  testing: currently no automated test suite
  
build_deployment:
  build_command: npm run build
  deployment: google cloud run via scripts
  environment: production variables in .env.production
```

## Contributing Guidelines
```yaml
code_standards:
  commit_format: conventional commits
  typescript: strict mode, avoid any
  react_patterns: functional components preferred
  styling: tailwind css with daisyui
  
  file_organization:
    components: src/components/
    pages: src/app/
    utilities: src/lib/
    database: src/db/
    types: src/types/
```

## Integration Points
```yaml
service_integrations:
  story_generation_workflow:
    purpose: ai content generation
    communication: rest api
    data_format: json
    error_handling: retry with exponential backoff
    
  notification_engine:
    purpose: user notifications
    communication: rest api
    event_triggers: [story_complete, export_ready, system_alerts]
    
  clerk_auth:
    purpose: user authentication
    integration: nextjs middleware
    webhooks: user lifecycle events
```

## Common Development Tasks
```yaml
database_operations:
  generate_migration: npm run db:generate
  run_migration: npm run db:migrate
  push_schema: npm run db:push
  seed_database: npm run db:seed
  open_studio: npm run db:studio
  
development_server:
  start_dev: npm run dev
  build_production: npm run build
  start_production: npm run start
  
code_quality_checks:
  run_linter: npm run lint
  fix_linting: npm run lint:fix
  type_check: npx tsc --noEmit
```

## Troubleshooting Guide
```yaml
common_issues:
  authentication_failures:
    symptoms: [login_redirect_loops, token_validation_errors]
    solutions: [check_clerk_keys, verify_domain_settings, clear_cookies]
    
  database_connection_issues:
    symptoms: [connection_timeouts, migration_failures]
    solutions: [verify_database_url, check_ssl_settings, run_migrations]
    
  build_failures:
    symptoms: [typescript_errors, dependency_conflicts]
    solutions: [fix_type_errors, update_dependencies, clear_node_modules]
```

## Documentation References
```yaml
documentation:
  main_docs: docs/README.md
  architecture: docs/ARCHITECTURE.md
  deployment: docs/DEPLOYMENT.md
  development: docs/DEVELOPMENT.md
  contributing: ../CONTRIBUTING.md
```

## Coding Style

- Use 2 spaces for indentation.
- Use single 'quotes' for strings, double "quotes" for JSX props.
- Always use semicolons.
- Interface names should be descriptive without prefixes (e.g., `Address`, `StoryOutlineParams`).
- Enum values should use UPPER_SNAKE_CASE (e.g., `CHILDREN_0_2`, `SCIENCE_FICTION`).
- Always use strict equality (`===` and `!==`).
- Use JSDoc-style comments for functions and complex logic.
- Organize imports: external packages first, then internal imports with `@/` path mapping.
- Prefer arrow functions for inline callbacks, regular functions for main declarations.
- Use async/await over promises for better readability.
- Always use trailing commas in objects and arrays.
- Use descriptive variable names and avoid abbreviations.
- Export interfaces and types from dedicated files in `/types/` directory.

---

**Agent Documentation Version**: 1.0.0  
**Last Updated**: June 27, 2025  
**Component Version**: 0.1.1  
**Framework**: Next.js 15.x with App Router
