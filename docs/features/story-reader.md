# Story Reader

## Overview

The Story Reader is the primary reading experience for Mythoria stories. It presents cover and introduction content, renders chapter text and illustrations, and gives readers lightweight controls to tune typography (font size, line height, margins) while keeping navigation and chapter switching simple. The same reader engine powers private reading (signed-in authors), public story pages, and public chapter deep links, with only the surrounding chrome changing based on where the reader is mounted.

---

## End-User Experience

### Where readers access a story

Readers can land on the Story Reader through three main entry points:

1. **Private reading (author-owned)**
   - **Full story landing:** `/[locale]/stories/read/[storyId]` shows the cover + table of contents (TOC) as the first page.
   - **Specific chapter:** `/[locale]/stories/read/[storyId]/chapter/[chapterNumber]` opens directly to a chapter.
   - Access requires sign-in; the UI prompts to sign in or create an account if the reader is signed out.
2. **Public story pages**
   - **Story landing:** `/[locale]/p/[slug]` opens the public cover + TOC.
   - **Chapter deep link:** `/[locale]/p/[slug]/chapter/[chapterNumber]` opens a specific chapter.
   - Public stories are accessible without authentication.
3. **Shared links**
   - `/[locale]/s/[token]` either redirects to the appropriate story route (if access is granted) or shows a preview with a sign-in prompt.

### What readers see (private story view)

Private story reading starts with a top action bar and then the reader content:

- **Action bar (top of the page):**
  - **Back to My Stories**
  - **Read (active), Listen, Edit, Print, Download PDF, Share, Duplicate**
- **Reader content:**
  - **Cover image** (if available)
  - **Dedication** (if provided)
  - **“by {author}” attribution**
  - **Mythoria branding message + logo**
  - **Table of Contents** with chapter links
  - **Start Reading** button (goes to chapter 1)
  - **Listen** button (only when the story has audio)
- **Rating panel** below the reader (private rating component).

Chapter pages keep the same reader content (chapter title, illustration, and formatted text) and add **chapter navigation buttons** (previous/next) at the bottom of each chapter page.

### What readers see (public story view)

Public story pages wrap the same reader core with a lighter header and call-to-action (CTA) sections:

- **Header actions:**
  - **Order Print**
  - **Download PDF** (sign-in required)
  - **Listen** (only when audio is available)
- **Metadata row:** author, publication date, target audience, graphical style, and novel style (when available).
- **Synopsis card** (if available).
- **Reader content:** same cover + TOC + chapter rendering as private view.
- **End-of-story CTA:** prompts to create a story, order a printed book, or download the PDF.
- **Public rating panel** at the bottom.

Chapter deep links keep the reader core plus a compact header and, when the reader finishes the last chapter, show a CTA section similar to the story landing page.

### Reading controls and navigation

The reader toolbar is **sticky at the top** and includes:

- **Reading Settings toggle** (opens/closes the expanded controls)
- **Chapter dropdown** (jump directly to cover/TOC or any chapter)

When expanded, the toolbar exposes three sliders, each with +/- buttons:

- **Text Size**
- **Line Height**
- **Margins**

Readers can reset all settings back to defaults. These preferences are saved locally in the browser, so they persist across sessions and stories on the same device.

### Chapter navigation

- **Table of Contents (TOC):**
  - Available on the cover/intro page.
  - Also accessible from a modal in the reader (via the toolbar chapter dropdown).
- **Previous / Next buttons:**
  - On each chapter page, the reader offers left/right navigation.
  - The navigation respects story boundaries (no “next” after the final chapter, no “previous” before chapter 1).

### Story styling & layout

- The story layout adapts to the **target audience** (e.g., children vs. adult reading styles).
- The reading toolbar’s sliders scale the template typography and spacing without breaking the layout.
- Cover and chapter illustrations are shown only when images exist; missing images are safely omitted.

---

## Developer Implementation Notes

### Page routes and containers

The Story Reader is mounted in several route handlers, with private vs. public chrome handled by the parent page:

- **Private story (cover/TOC):** `src/app/[locale]/stories/read/[storyId]/page.tsx`
- **Private story chapter:** `src/app/[locale]/stories/read/[storyId]/chapter/[chapterNumber]/page.tsx`
- **Public story (cover/TOC):** `src/app/[locale]/p/[slug]/PublicStoryPageClient.tsx`
- **Public story chapter:** `src/app/[locale]/p/[slug]/chapter/[chapterNumber]/page.tsx`
- **Shared link preview / redirect:** `src/app/[locale]/s/[token]/SharedStoryPageClient.tsx`

The private routes enforce authentication using Clerk’s `SignedIn`/`SignedOut` wrappers and additionally rely on server-side API checks for ownership and status.

### Core reader component

`src/components/StoryReader.tsx` is the single reading engine used everywhere. It handles:

- **Cover/intro rendering** (chapter `0`) vs. **chapter rendering** (chapter `>= 1`).
- **Chapter navigation**, including locale-aware public URLs for `/p/[slug]` and private URLs for `/stories/read/[storyId]`.
- **Table of contents modal** and “start reading” button behavior.
- **Audio CTA** on the cover page when `story.hasAudio` is true.
- **Scoped image handling** via `toAbsoluteImageUrl` so relative or missing URLs fail safely.

### Reading toolbar and persisted settings

`src/components/ReadingToolbar.tsx` provides the UX for reading customization:

- Stores preferences in `localStorage` under `mythoria-reading-settings`.
- Writes CSS custom properties to `document.documentElement`:
  - `--reading-font-scale`
  - `--reading-line-height-scale`
  - `--reading-margin-scale`
- Emits settings back to `StoryReader`, which applies them as inline CSS variables on the `.mythoria-story-scope` wrapper so they cascade into the story template styles.

### CSS template loading & scoping

`src/lib/story-css.ts` loads audience-specific CSS templates from `/public/templates/*.css`:

- Loads the CSS for the story’s `targetAudience` (falls back to `all_ages`).
- Scopes every selector to `.mythoria-story-scope` so the template only affects reader content.
- Appends variable-based overrides to ensure reading controls always scale text and spacing even when template defaults are strict.

### Data sources and API contracts

The reader relies on the following APIs:

- **Private story:** `GET /api/stories/{storyId}/chapters`
  - Returns `story` metadata + `chapters[]`.
  - Enforces author ownership via `ensureStoryIdAccess`.
- **Private chapter:** `GET /api/stories/{storyId}/chapters/{chapterNumber}`
  - Returns `story`, `chapters[]`, and `currentChapter`.
  - Requires authentication and allows access for published stories or the owner.
- **Public story:** `GET /api/p/{slug}`
  - Returns `story` metadata + `chapters[]` when `isPublic` is true.
- **Public chapter:** `GET /api/p/{slug}/chapter/{chapterNumber}`
  - Returns `story`, `chapters[]`, and `currentChapter` when public.
- **Shared story access:** `GET /api/share/{token}`
  - Redirects to a private story or returns a preview that prompts for auth.

### Ratings and follow-up actions

- **Private ratings:** `src/components/StoryRating.tsx` renders below the reader in private routes.
- **Public ratings:** `src/components/PublicStoryRating.tsx` renders below the reader on public routes.
- **Actions:** The parent pages provide print, download PDF, share, duplicate, and listen actions via the action bar or public CTAs.

### Translations and UI copy

Copy for the reading UI lives in locale files under `src/messages/**/StoryReader.json` and `src/messages/**/ReadingToolbar.json`, and is consumed via `useTranslations` in the reader components.

---

## Quick Debugging Checklist

1. **Reader loads but styling looks wrong:** confirm the `targetAudience` is present and that the CSS file exists under `public/templates/`.
2. **TOC or chapter navigation breaks on public routes:** confirm that the slug-based path is present and locale segments are detected in `StoryReader` navigation helpers.
3. **Reading settings not persisting:** check localStorage permissions and ensure `mythoria-reading-settings` is being set.
4. **Images not rendering:** verify `coverUri`/`imageUri` exist and `toAbsoluteImageUrl` is producing a valid URL.
5. **Auth-related errors on private reads:** confirm Clerk session and the `/api/stories/{id}/chapters` permissions (ownership + status).
