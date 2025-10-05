# Mythoria Web App

## Product snapshot

- Next.js 15 App Router experience that brings Mythoria stories to life across web and PWA entry points.
- Multi-locale (en-US, pt-PT, es-ES, fr-FR) storytelling with tailored copy, SEO metadata, and Clerk-protected user spaces.
- Serves as the customer-facing bridge into the Mythoria micro-service constellation: Admin, Story Generation Workflows, and Notification Engine.

## Key experiences

- **Story Builder** – Guided creation flow where users describe protagonists, settings, and tones; server actions orchestrate calls to the Story Generation Workflows (SGW) service and stream progress updates.
- **Illustration & Media Studio** – Upload, crop, and AI-enhance imagery via Google Cloud Storage backed pipelines, plus optional audio narration playback.
- **Story Library** – Authenticated dashboard with filtering, quick previews, and export to PDF/audio for each generated narrative.
- **Commerce & Credits** – Revolut Checkout integration for purchasing credits, VAT-aware receipts, and usage analytics surfaced per locale.
- **Inspiration Hub** – Public marketing surfaces (`/[locale]/get-inspired`, blog) that showcase featured tales, seasonal campaigns, and capture email signups.

## Generative narrative pipeline

1. Wizard pages collect brief inputs and persist them via server-side `story-session` helpers for resilience across reloads.
2. The server calls SGW for outline + chapter generation, image refinement, and text-to-speech, storing job metadata in PostgreSQL through Drizzle.
3. Notification Engine webhooks broadcast completion events and transactional emails, localized automatically.
4. Client components poll job status with React hooks (e.g., `useStorySessionGuard`) and render real-time progress updates.

## High-level architecture

- **Frontend composition** – App Router organizes locale-aware layouts (`src/app/[locale]/layout.tsx`) and route groups for auth, dashboard, and marketing. Server components handle data fetching; interactive widgets opt into `'use client'` when necessary.
- **Design system** – TailwindCSS + DaisyUI components live in `src/components/*`, with feature clusters such as `src/components/my-stories`, `src/components/ai-image-editor`, and shared elements like `StoryReader.tsx` and `ToastContainer.tsx`.
- **State & data flow** – Feature hooks (e.g., `src/hooks/useStoriesTable.ts`) coordinate client state, while server utilities in `src/lib/story-session.ts` keep canonical progress in the database. Shared types reside in `src/types`.
- **Persistence layer** – Drizzle ORM maps to the central Mythoria PostgreSQL cluster. Migration and seeding scripts live in `src/db`, mirrored in the Story Generation Workflows database for cross-service analytics.
- **API surface** – Next.js server actions and route handlers (`src/app/api`) expose REST endpoints for webhooks (Clerk, Notification Engine), media uploads, and SGW callbacks. Handlers enforce idempotency and structured logging.

## Service interactions inside Mythoria

- **Story Generation Workflows** – Primary AI pipeline. Web app invokes it for story outlines, illustrations, and narration via `src/lib/sgw-client.ts`, passing contextual metadata like locale and voice preferences.
- **Notification Engine** – Handles transactional emails, push notifications, and digest scheduling. Triggered from `src/app/api/webhooks/` handlers once SGW completes.
- **Mythoria Admin** – Shares database tables and analytics dashboards; this web app surfaces read-only subsets for end users while admin retains elevated operations.
- **Common messaging** – Google Cloud Pub/Sub topics (configured in `src/lib/pubsub.ts`) distribute events to keep Admin and Notification Engine in sync with user activity.

## Platform & operations

- **Runtime** – Deployed to Google Cloud Run via Cloud Build (`cloudbuild.yaml`). Images bundle static assets and run `next start` for production parity.
- **Observability** – Google Analytics 4, custom event tracking, and Sentry instrumentation emitted through helpers in `src/lib/analytics.ts` and `src/lib/googleAdsConversions.ts`.
- **Performance** – Turbopack-powered dev server, static asset caching, PWA manifest (`src/lib/manifest.ts`), and lazy loading for heavy media.
- **Security & compliance** – Clerk secures authentication, authorization rules live in `src/lib/authorization.ts`, and VAT validation ensures EU invoicing accuracy.

## Roadmap signals for contributors

- Expand multilingual storytelling presets and ensure locale JSON files remain lean with `npm run i18n:prune:*` scripts.
- Continue refining offline support for the reader experience using the PWA capabilities already scaffolded.
- Align future feature toggles with `env.manifest.ts` so downstream services inherit consistent configuration.
