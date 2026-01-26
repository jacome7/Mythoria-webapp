# Homepage (Mythoria Home Experience)

## Purpose

The Homepage is the first-touch experience for Mythoria. It showcases what the platform does, who it is for, and how to get started. Visitors can explore sample stories, understand the creation flow, and jump into story creation or sign-up.

---

## End-User Experience

### What visitors see and can do

- **Hero + animated headline**
  - A headline that animates through story-themed words.
  - A clear “Write your own story” call-to-action that leads to the story creation flow.
- **Sample story highlights**
  - A carousel-style gallery with sample books.
  - Users can open a sample to see tags, style, and synopsis in a modal.
  - Cards are optimized for desktop and mobile layouts.
- **Audience-focused sections**
  - Four audience cards (Kids, Groups & Yearbooks, Adults, Companies) that link to public sample stories.
- **“What drives us” mission block**
  - A short mission statement and a link to the About Us page.
- **Why Choose Mythoria**
  - Feature grid that expands on click/tap to reveal details.
- **How it works timeline**
  - A step-by-step overview of the story creation process.
- **Live community counter**
  - A live-updating counter showing the number of stories created.
- **Sign-up call to action**
  - Only visible to signed-out visitors.
- **Product Hunt badge**
  - External link for following the product.
- **Quote of the Day**
  - A rotating inspirational quote (changes daily).

### Personalization via intent links

Visitors can arrive through **intent URLs** such as:

- `/i/romance`
- `/i/kids_bedtime/child`

These links record the intent and (optionally) the recipient in a cookie, then redirect the visitor to the localized homepage. The sample gallery uses this context to prioritize the most relevant sample books first.

---

## Routing & Navigation

### Public routes

- **Homepage (localized):** `/{locale}` (ex: `/en-US`, `/pt-PT`).
- **Intent routing (non-localized):**
  - `/i/:intent` → redirects to `/{locale}`
  - `/i/:intent/:recipient` → redirects to `/{locale}`

Locales are derived from the `Accept-Language` header and must match `SUPPORTED_LOCALES`. If no match is found, `en-US` is used by default.

---

## Translation Engine

### Framework

- Mythoria uses **next-intl** with **locale-prefixed routes** and JSON message bundles.
- Translation files live in `src/messages/<locale>` and are loaded server-side in `src/app/[locale]/layout.tsx`.
- The homepage uses the `HomePage` namespace in `HomePage.json` plus `StoryCounter.json` for the counter.
- Missing translations are handled by the custom `ClientProvider`, which emits deterministic fallbacks and console warnings for missing keys.

### Key translation touchpoints

- `src/app/[locale]/page.tsx` uses `useTranslations('HomePage')` for all homepage copy.
- `src/components/WhyChooseMythoria.tsx` uses `HomePage.whyChooseMythoria.*`.
- `src/components/StoryCounter.tsx` uses `StoryCounter.*`.

---

## Developer Implementation Details

### Homepage UI composition

**Main entry point:** `src/app/[locale]/page.tsx`.

Key UI sections and their sources:

- **Hero + CTA**
  - Uses `react-type-animation` to rotate the `HomePage.words` list.
  - If the translations are missing, `fallbackWords` are used as a safety fallback.
- **Sample audience cards (Kids, Groups, Adults, Companies)**
  - Hardcoded sample story links pointing to public story slugs.
  - Each card uses localized title/description + image alt text.
- **Infinite Gallery (sample carousel)**
  - `InfiniteGallery` loads `public/SampleBooks/SampleBooks.json` and displays the cover artwork.
  - Sample metadata includes `id`, `title`, `synopses`, `locale`, `intent`, `recipients`, `tags`, and `style`.
  - Missing images gracefully fall back to a text placeholder.
  - Clicking a sample opens a modal with tags, style, and synopsis.
- **What Drives Us**
  - Copy and emphasized text are controlled by `HomePage.whatDrivesUs.*`.
- **Why Choose Mythoria**
  - Feature cards are defined by the `HomePage.whyChooseMythoria.features` translation object.
  - Cards expand on click using local state in `WhyChooseMythoria`.
- **How It Works timeline**
  - Data is fully driven by `HomePage.howItWorks.*` translations.
  - Uses DaisyUI timeline classes.
- **Story Counter**
  - `StoryCounter` polls `/api/stories?action=count` every 150 seconds.
  - Returned count is transformed in the UI (`count * 2 + 100`) before display.
  - Error and loading states are localized via `StoryCounter.json`.
- **Signed-out CTA**
  - Wrapped in Clerk’s `SignedOut` to show only to anonymous users.
- **Quote of the Day**
  - `QuoteOfTheDay` selects a deterministic quote based on the day-of-year.
- **Product Hunt badge**
  - Static external link with a hosted badge image.

### Intent detection & redirection (src/app/i)

The **intent system** supports marketing and onboarding links that pre-contextualize the homepage.

#### Supported routes

- `/i/:intent`
- `/i/:intent/:recipient`

#### Validation and normalization

- Intents are defined in `src/constants/intents.ts` and normalized with `normalizeIntent()`.
- Recipients are defined in `src/constants/recipients.ts` and normalized with `normalizeRecipient()`.
- Only valid values are recorded; invalid values are ignored.

#### Cookie storage

- The detected context is stored in `mythoria_intent_context` for 24 hours.
- `IntentContext` is defined in `src/types/intent-context.ts`.
- The client reads the cookie via `useIntentContext()` (used on the homepage to drive gallery ordering).

#### Redirect behavior

- Both intent routes redirect to the localized homepage (`/{locale}`).
- Locale detection uses `Accept-Language` and falls back to `en-US`.
- `/i/:intent` uses `NEXT_PUBLIC_BASE_URL` (or host header) to build the redirect, with a fallback to `https://mythoria.pt`.
- `/i/:intent/:recipient` uses `request.url` as its base URL when constructing the redirect.

---

## Files to Know (Quick Map)

- **Homepage UI:** `src/app/[locale]/page.tsx`
- **Sample gallery:** `src/components/InfiniteGallery.tsx`
- **Intent routes:** `src/app/i/[intent]/route.ts` and `src/app/i/[intent]/[recipient]/route.ts`
- **Intent helpers:** `src/constants/intents.ts`, `src/constants/recipients.ts`, `src/types/intent-context.ts`, `src/hooks/useIntentContext.ts`
- **Translations:** `src/messages/<locale>/HomePage.json`, `src/messages/<locale>/StoryCounter.json`
- **Sample book data:** `public/SampleBooks/SampleBooks.json`
- **Story count API:** `src/app/api/stories/route.ts`

---

## Tips for Extending or Debugging

- **Adding new homepage copy:** update `HomePage.json` in `en-US` first, then run i18n parity checks and add translations.
- **Adding intents or recipients:** update the constants and ensure any marketing URLs use the canonical format.
- **Changing gallery ordering:** adjust the `sortBooksByContext` function in `InfiniteGallery`.
- **New locales:** add to `SUPPORTED_LOCALES`, add message files, and ensure `generateStaticParams()` covers the locale.
- **Testing intent flows:** use `/i/:intent` in the browser, confirm the cookie, and confirm the gallery order updates.
