# GitHub Copilot Instructions for Mythoria WebApp

## Project Overview

Mythoria WebApp is a Next.js 15 full-stack application for creating AI-powered personalized stories. It's the customer-facing frontend for the Mythoria platform, integrating with Story Generation Workflows (SGW), Notification Engine, and Admin services via REST APIs and Google Cloud Pub/Sub.

**Stack**: Next.js 15 App Router, React 19, TypeScript 5 (strict), PostgreSQL + Drizzle ORM, Clerk Auth, TailwindCSS + DaisyUI, next-intl (multi-locale).

## Architecture & Key Patterns

### Routing & App Structure

- **Locale-first routing**: All routes start with `[locale]` segment (en-US, pt-PT, es-ES, fr-FR)
- **Server components by default**: Only add `'use client'` when hooks, browser APIs, or interactivity are required
- **Middleware coordination**: `src/middleware.ts` chains Clerk auth + next-intl locale routing. Preserve `/offline` bypass for PWA fallback
- **Path aliasing**: Use `@/` imports (configured in tsconfig.json) instead of relative paths

### Data Layer (Drizzle ORM)

- **Schema location**: `src/db/schema/` - must re-export new tables/enums in `schema/index.ts`
- **Migration workflow**: After schema changes, run `npm run db:generate` to create SQL migrations under `drizzle/`, then `npm run db:migrate` locally
- **Services pattern**: Business logic lives in `src/db/services/` - keep framework-agnostic and covered by co-located Jest tests
- **Build-time safety**: Check `process.env.NEXT_PHASE` before database access in modules that execute during static generation

### Component Patterns

- **Design system**: TailwindCSS + DaisyUI for styling. Use utility classes over inline styles
- **Component organization**: Feature-specific components in subfolders (`ai-edit/`, `my-stories/`, `image-editing-tab/`)
- **Image optimization**: Use `next/image` for all images. Remote sources must be allowlisted in `next.config.ts` `remotePatterns`
- **Hydration safety**: Delay auth-dependent rendering with `useEffect` + local state (see `Header.tsx` pattern)

### Internationalization (next-intl)

- **Source of truth**: `src/messages/en-US/` is canonical. All locales must mirror file structure
- **Translation workflow**:
  1. Update `en-US` JSON files
  2. Propagate structure to all locales (pt-PT, es-ES, fr-FR)
  3. Run `npm run i18n:keys` to regenerate `src/types/translation-keys.d.ts`
  4. Run `npm run i18n:parity` to verify no missing/extra keys
- **Usage**: Import `useTranslations`/`getTranslations` from `next-intl`. Never hardcode user-facing strings
- **Voice & tone**: Direct and clear but playful and warm, representing a young man in his early 20s. Use emojis sparingly, storytelling references when appropriate

### API & Service Integration

- **API routes**: Use App Router convention (`route.ts` with exported GET/POST/etc functions returning `NextResponse`)
- **SGW client**: Use helpers from `src/lib/sgw-client.ts` (`sgwFetch`, `sgwUrl`, `sgwHeaders`) for Story Generation Workflow calls
- **Service communication**: Google Cloud Pub/Sub topics configured in `src/lib/pubsub.ts` for event-driven architecture
- **Authentication**: Clerk middleware validates JWT on protected routes. Use `src/lib/authorization.ts` for story ownership checks

### Environment Variables

- **Manifest-driven**: `env.manifest.ts` is the single source of truth describing every env var, its scopes, and whether it's a secret
- **Validation**: Run `npm run check:env` after env changes to ensure parity between manifest, `.env.local`, and deployment configs
- **Public vars**: Must have `NEXT_PUBLIC_` prefix and be in the manifest with `public` scope
- **Secrets**: Never commit. Use Secret Manager in production, `.env.local` for development

### Testing Strategy

- **Unit tests**: Jest with co-located `.test.ts`/`.test.tsx` files. Config: `jest.config.cjs`, setup: `jest.setup.ts`
- **Component tests**: React Testing Library for UI behavior
- **E2E tests**: Playwright in `tests/playwright/`. Auth state stored in `tests/playwright/.auth/user.json` (regenerate with `REFRESH_AUTH=1`)
- **Anonymous E2E**: Set `SKIP_AUTH_SETUP=1` for testing without authentication
- **Translation validation**: `npm run test:e2e:anon` runs missing-translation detection suite

## Critical Workflows

### Pre-Commit Checklist

Run these before committing (CI will fail if they don't pass):

```bash
npm run lint          # ESLint (flat config)
npm run typecheck     # TypeScript --noEmit
npm run test          # Jest unit tests
npm run format        # Prettier validation
```

### Internationalization Maintenance

```bash
npm run i18n:keys     # After editing translations
npm run i18n:parity   # Verify locale alignment
npm run i18n:prune:pt-PT:common  # Remove unused keys (adjust locale/namespace)
```

### Database Operations

```bash
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Apply migrations locally
npm run db:push       # Push schema without migration (dev only)
npm run db:studio     # Launch Drizzle Studio inspector
```

### Development Server

```bash
npm run dev           # Start Turbopack dev server (http://localhost:3000)
```

## Design & UI Guidelines

### Styling Standards

- **Framework**: TailwindCSS utility classes + DaisyUI component library
- **Consistency**: Match existing UI patterns - beautifuly simple and clear design
- **Icons**: Use `react-icons` package for all icons
- **Responsive**: Mobile-first approach with DaisyUI's responsive utilities

### User-Facing Text Voice

Mythoria's voice represents a young man in his early 20s:

- Direct and clear, but also playful and warm
- Use emojis very sparingly and only for emphasis
- Storytelling-steeped: appropriate references to books/films, poetic touches or rhymes when fitting

### Supported Locales

1. **American English** (`en-US`) - as spoken in New York
2. **European Portuguese** (`pt-PT`) - as spoken in Lisbon
3. **European Spanish** (`es-ES`) - as spoken in Madrid
4. **European French** (`fr-FR`) - as spoken in Paris

## Common Gotchas

### Next.js Build-Time Behavior

- Routes like `sitemap.xml` execute during builds. Guard database/network calls with `process.env.NEXT_PHASE` checks
- Static generation requires async API routes to have safe fallbacks when executed without runtime context

### PWA & Offline Support

- Offline fallback route: `/offline` (no locale prefix)
- PWA config in `next.config.ts` via `@ducanh2912/next-pwa`
- Service worker generated in `public/sw.js` - don't edit manually

### Clerk Authentication

- Middleware adds clock skew tolerance (600s) for distributed systems
- Storage state must be fresh for Playwright tests. Force refresh with `REFRESH_AUTH=1` if seeing auth failures
- Public story routes (`/[locale]/p/`) bypass Clerk to allow unauthenticated access

### Story Session Management

- Server-side session helpers in `src/lib/story-session.ts` persist wizard state across page reloads
- Use `getCurrentStoryId()`, `setStep1Data()`, etc. to maintain state through multi-step story creation
- `hasValidStorySession()` checks if user can proceed to next step

## Deployment

### Production Build

```bash
npm run build         # Creates standalone output
npm run start         # Test production build locally
```

### Google Cloud Run

```bash
npm run deploy:production  # Triggers Cloud Build (requires gcloud CLI)
```

- Container built from `Dockerfile` with multi-stage build
- Environment substitutions defined in `cloudbuild.yaml`
- Secrets injected via Secret Manager at runtime

## File Organization Reference

```
src/
├── app/                    # App Router - locale-prefixed routes
│   ├── [locale]/          # Locale segment (en-US, pt-PT, etc.)
│   └── api/               # API routes (webhooks, REST endpoints)
├── components/            # React components ('use client' when needed)
├── db/                    # Drizzle schema, services, migration scripts
│   ├── schema/           # Table definitions
│   └── services/         # Business logic + tests
├── lib/                   # Server utilities (auth, analytics, SGW client)
├── utils/                 # Pure helpers + co-located tests
├── messages/              # next-intl translation bundles
│   ├── en-US/            # Source locale
│   ├── pt-PT/
│   ├── es-ES/
│   └── fr-FR/
├── types/                 # TypeScript types (translation-keys.d.ts is generated)
├── config/                # Configuration (locales, feature flags)
└── constants/             # Static values

docs/                      # High-level architecture & product docs
scripts/                   # Env validation, i18n tools, deployment
tests/playwright/          # E2E tests + auth setup
```

## Additional Resources

- **Agent guides**: See `AGENTS.md` files in root and `src/` subdirectories for detailed conventions
- **Architecture**: `docs/ARCHITECTURE.md` for system design and integration patterns
- **Features**: `docs/features.md` for complete feature list
- **Development**: `docs/DEVELOPMENT.md` for setup and contribution guide

## Questions to Ask Before Starting

When implementing new features or major changes:

1. **Does this affect environment variables?** → Update `env.manifest.ts` and run `npm run check:env`
2. **Does this add user-facing text?** → Add to all 4 locale JSON files, run `npm run i18n:keys` and `npm run i18n:parity`
3. **Does this change the database schema?** → Update `src/db/schema/`, run `npm run db:generate`, commit migrations
4. **Does this need to work during builds?** → Guard external calls with `NEXT_PHASE` checks
5. **Is this a new API route?** → Ensure proper auth middleware, error handling, and return `NextResponse`
6. **Does this integrate with external services?** → Encapsulate in `src/lib/` and use existing client patterns (e.g., `sgw-client.ts`)
7. **Will this affect the PWA offline experience?** → Verify `/offline` route continues to work

8. **Was it requested to create a documentation file?** → If the user didn't clearly specified to create a documentation file, DO NOT CREEATE IT.

---

_Last updated: 2025-10-04_
