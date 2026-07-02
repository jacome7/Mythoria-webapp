# Homepage (Mythoria Home Experience)

## Purpose

The Homepage is the first-touch experience for Mythoria. It showcases what the platform does, who it is for, and how to get started. Visitors can explore sample stories, understand the creation flow, and jump into story creation or sign-up.

---

## End-User Experience

### What visitors see and can do

- **Paper-cut storytelling hero**
  - One shared skeleton, themed per style: cloud + themed floater pairs top-left/right (balloon, pennant, hearts…), sparkles above a centered headline/subtitle/CTA, then a scene sandwich — papercut background, a **rotating carousel of real people holding a real Mythoria book** (the product/human anchor, locale-aware covers), and a papercut foreground strip.
  - Each person slide eases in from the right, holds ~4 s, eases out to the left; rotation pauses off-screen/hover and respects `prefers-reduced-motion`.
  - A 3-up feature card (per-style icons + copy) anchors the bottom of the scene.
  - The style is a **composition** chosen by the visitor's intent — or overridden via `?intent=` query param (see below). The full look — palette, typography, slot grammar, animation — is documented in the [Paper-Cut Design System](../papercut-design-system.md).
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

These links record the intent and (optionally) the recipient in a cookie, then redirect the visitor to the localized homepage. The hero uses this context to choose the paper-cut **composition** to display (via `src/components/papercut/registry.ts`).

**Active intent → composition mapping:**

| Intent         | Composition    | URL               |
| -------------- | -------------- | ----------------- |
| _(default)_    | `kids_fantasy` | `/`               |
| `sports_teams` | `sports_teams` | `/i/sports_teams` |
| `romance`      | `romance`      | `/i/romance`      |
| `grandparents` | `grandparents` | `/i/grandparents` |

**Query param override:** appending `?intent=<value>` to any homepage URL switches the composition without setting a cookie — useful for campaign previews and QA. Precedence: `?intent=` query param > intent cookie > default. The override is read via `useIntentOverride` in a `useEffect` (not `useSearchParams`) to avoid breaking static prerendering of the hero.

**Phase-1 section assets policy:** only the hero is intent-skinned. All sections below the hero (Footer, Header, HowItWorks, etc.) use the `kids_fantasy` asset folder via `homepageAsset()` from `src/constants/homepageAssets.ts`. The homepage book gallery is intent-prioritized through the intent cookie, so a visitor with `grandparents` context sees grandparents sample books first. Per-intent section art is a phase-2 candidate.

**Locale-aware hero assets:** background/foreground/person assets may carry a locale suffix (e.g. `background_mobile_pt-PT.webp`, `person1_pt-PT.webp`). Resolution happens at build time through `src/components/papercut/heroManifest.ts` with the deterministic fallback chain `exact locale → en-US → unsuffixed → first available` — missing variants never 404. Each style folder documents its assets in `assets_metadata.json` (validated by `npm run homepage:assets`) and lists outstanding designer work in `MISSING_ASSETS.md`.

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

- **Paper-cut hero + CTA**
  - Rendered by `src/components/papercut/PaperCutHero.tsx` (mounted full-bleed in `page.tsx`, before the page container).
  - The renderer owns the canonical skeleton (decor template, scene sandwich, feature card); `PaperCutHero` resolves a style composition from the intent cookie (`resolveComposition`), assets by slot name through `heroManifest.ts`, and renders `PaperCutLayer` decor, an `ArtDirectedImage` background/foreground pair and the `PersonCarousel` inside a `PaperCutStage`, plus `FeatureCard`.
  - Copy comes from `HomePage.intents.<styleId>.hero.*` (`headline`, `subtitle`, `subtitleEmphasized`, `cta`, `alt.person`, `features.feature{1..3}.*`) — the default style reads `intents.kids_fantasy.hero.*`.
  - To author a new style, see the [Paper-Cut Design System](../papercut-design-system.md).
- **Sample audience cards (Kids, Groups, Adults, Companies)**
  - Hardcoded sample story links pointing to public story slugs.
  - Each card uses localized title/description + image alt text.
- **Infinite Gallery (sample carousel)**
  - `InfiniteGallery` still exists in the repo but is **no longer mounted on the homepage** (it was the previous hero's right-side carousel). It can be reused elsewhere.
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
- **Paper-cut hero:** `src/components/papercut/` (renderer, compositions, registry) — see the [Paper-Cut Design System](../papercut-design-system.md)
- **Sample gallery (unused on homepage):** `src/components/InfiniteGallery.tsx`
- **Intent routes:** `src/app/i/[intent]/route.ts` and `src/app/i/[intent]/[recipient]/route.ts`
- **Intent helpers:** `src/constants/intents.ts`, `src/constants/recipients.ts`, `src/types/intent-context.ts`, `src/hooks/useIntentContext.ts`, `src/hooks/useIntentOverride.ts` (`?intent=` query param)
- **Section asset helper:** `src/constants/homepageAssets.ts` (`homepageAsset()` used by Footer, Header, HowItWorks, etc.)
- **Translations:** `src/messages/<locale>/HomePage.json`, `src/messages/<locale>/StoryCounter.json`
- **Sample book data:** `public/SampleBooks/SampleBooks.json`
- **Story count API:** `src/app/api/stories/route.ts`

---

## Tips for Extending or Debugging

- **Adding new homepage copy:** update `HomePage.json` in `en-US` first, then run i18n parity checks and add translations.
- **Adding a new hero composition (per intent):** follow the recipe in the [Paper-Cut Design System](../papercut-design-system.md) — add art under `public/homepage/<id>/`, a config in `src/components/papercut/compositions/`, and one line in `registry.ts`.
- **Adding intents or recipients:** update the constants and ensure any marketing URLs use the canonical format.
- **Changing gallery ordering:** adjust the `sortBooksByContext` function in `InfiniteGallery`.
- **New locales:** add to `SUPPORTED_LOCALES`, add message files, and ensure `generateStaticParams()` covers the locale.
- **Testing intent flows:** use `/i/:intent` in the browser, confirm the cookie, and confirm the gallery order updates.
