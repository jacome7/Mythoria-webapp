# App Router – Agent Guide

## Routing & Layouts

- Locale is the leading dynamic segment (`/[locale]/…`). Update `routing.locales` and `generateStaticParams` when introducing new locales so static generation works correctly.
- `src/app/layout.tsx` wires global providers (Clerk, analytics, PWA meta). Preserve the header-derived locale detection and keep `<ClerkProvider>` at the top level.
- `src/app/[locale]/layout.tsx` loads locale messages from `src/messages/<locale>`. When adjusting the loader, maintain the filesystem fallback to `en-US` to avoid build-time failures.
- The offline experience lives in `src/app/offline`. Ensure the route remains a plain page (no locale prefix) because middleware bypasses i18n for `/offline`.

## API Routes (`src/app/api`)

- Implement endpoints with the App Router `route.ts` convention and return `NextResponse`. Avoid using legacy `pages/api` patterns.
- Keep routes resilient at build time. Guard database or network calls with the `NEXT_PHASE` checks already used in sitemap generation to prevent errors during static analysis.
- Validate Clerk authentication or locale expectations in middleware-friendly ways (e.g., rely on request headers added by `src/middleware.ts`).

## Styling & Assets

- Global Tailwind customizations live in `src/app/[locale]/globals.css`. Reuse utility classes; only add new global styles when multiple components benefit.
- Static metadata assets (sitemaps, manifest, offline page) reside directly under `src/app`. Keep them free of client-only APIs so they can execute during builds.

## Data Fetching & Performance

- Prefer server components for data fetching and pass serialized data to client components for interactivity.
- Memoize expensive client logic (e.g., TypeAnimation sequences) and provide safe fallbacks when translations are missing.
- When reading from the filesystem (messages, manifests), catch parse errors and log helpful warnings rather than letting the request crash.

## Testing & QA

- Cover complex route handlers with Jest (using mocked Next `Request`/`Response` objects) or Playwright integration tests when end-to-end behavior matters.
- Sitemap and feed routes should have regression tests that exercise both build-time and runtime branches when practical.
