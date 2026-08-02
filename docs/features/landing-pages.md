# Landing Pages (SEO/GEO Campaign Pages)

## Purpose

The landing-page engine renders focused, SEO- and GenAI-optimized marketing pages under
`/{locale}/lp/{slug}` (e.g. `/pt-PT/lp/livro-personalizado-criancas-autistas`). Each page targets a
specific intent or niche (a topic, audience, or use case), is written directly in its locale, and is
assembled from a **typed content object** rendered by one shared template. Translations share a
stable `translationKey` while keeping locale-specific public slugs. There is no CMS — content is
version-controlled TypeScript.

The engine is built so a new page is **content-first**: author a typed content file, keep editorial/source artifacts in docs, and place only public runtime assets under the page's `public/landing-pages/{slug}/assets/` folder. The template, metadata, structured data, and sitemap inclusion are handled for you.

---

## End-User Experience

A landing page renders (top to bottom) inside the normal site shell (header, footer, cookie banner):

- **Hero** — eyebrow badge, H1 (`title`), emotional headline + subheadline, hero image, primary CTA
  (→ story creation) and a secondary CTA (→ `#exemplos`).
- **Quick answer** — a single, self-contained answer paragraph (great for AI answer extraction).
- **Two-column intro** — "what is Mythoria?" + "why this fits".
- **Social-story explainer** _(optional)_ — a question-titled definitional block.
- **Benefits grid** — five short value statements.
- **Use cases** _(optional)_ — a grid of concrete, query-shaped situations, each with a short answer.
- **Examples** (`#exemplos`) — five fictional concept book cards (cover, labels, synopsis, excerpt).
- **Process + Formats** — "how it works" steps and available output formats.
- **For professionals** _(optional)_ — a section for therapists/educators/partners with a contact CTA.
- **Glossary** _(optional)_ — plain definitions of key terms (long-tail SEO + entity clarity).
- **FAQ** — accordion of question/answer pairs (also emitted as FAQ structured data).
- **Safety note** — the "not a clinical/medical tool" disclaimer.
- **Final CTA** — repeated primary call to action.

An "Atualizado em …" freshness line is shown at the top of the content area, derived from `updatedAt`.

---

## Routing & Navigation

- **Route:** `src/app/[locale]/lp/[slug]/page.tsx` (dynamic, statically generated).
- **URL:** `/{locale}/lp/{slug}` — resolution requires the exact `locale + slug`. A globally unique
  slug under the wrong locale permanently redirects to its canonical locale.
- **Language switching:** reciprocal hreflang links provide translated slugs. If a landing has no
  translation for the selected locale, navigation falls back to that locale's homepage.
- **Static generation:** `generateStaticParams()` returns `{ locale, slug }` for every registered page
  via `getLandingPageStaticParams()`.
- **Unknown locale or slug:** `notFound()`.

---

## Architecture & Data Flow

```
src/content/landing-pages/<name>.<locale>.ts   ← the typed content object
        │
        ▼
src/content/landing-pages/index.ts             ← registry + lookup helpers
        │   getLandingPage(locale, slug) / getLandingPageTranslations(translationKey)
        ▼
src/app/[locale]/lp/[slug]/page.tsx            ← route: generateMetadata + render
        │
        ▼
src/components/landing-pages/LandingPageTemplate.tsx
        │   renders sections + injects JSON-LD via buildStructuredData()
        ▼
Rendered landing page (+ <script type="application/ld+json">)
```

Key files:

- **Content type:** `src/content/landing-pages/types.ts` (`LandingPageContent`).
- **Registry:** `src/content/landing-pages/index.ts`.
- **Template:** `src/components/landing-pages/LandingPageTemplate.tsx`.
- **Route:** `src/app/[locale]/lp/[slug]/page.tsx`.
- **Tests:** `src/content/landing-pages/landing-pages.test.ts`.
- **SEO helpers:** `src/lib/seo.ts` (`buildAbsoluteUrl`, `buildLocalizedUrl`, `buildLocalizedPath`).

---

## Content Type Reference (`LandingPageContent`)

| Field                         | Required | Purpose                                                                                       |
| ----------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `slug`                        | yes      | URL slug under `/lp/`. Keep stable once indexed (changing it costs SEO / needs a redirect).   |
| `locale`                      | yes      | Page locale (e.g. `pt-PT`). Must match the URL locale.                                        |
| `translationKey`              | yes      | Stable family key shared by all translated variants.                                          |
| `homepageCard`                | no       | Locale-specific title and description for the homepage landing Hub.                           |
| `title`                       | yes      | The visible H1.                                                                               |
| `metaTitle`                   | yes      | `<title>` + OG/Twitter title.                                                                 |
| `metaDescription`             | yes      | Meta description + OG/Twitter description (keep ≤ ~155 chars).                                |
| `primaryIntent`               | yes      | Analytics intent; appended to the create-story CTA query.                                     |
| `riskRating`                  | yes      | `green` \| `yellow` \| `red` — editorial sensitivity flag.                                    |
| `updatedAt`                   | yes      | `YYYY-MM-DD`. Drives the on-page "Atualizado em" line, `dateModified`, and sitemap `lastmod`. |
| `indexable`                   | yes      | `true` → indexable + included in sitemap; `false` → `noindex,nofollow` + excluded.            |
| `breadcrumbLabel`             | no       | Short breadcrumb name (falls back to `title`).                                                |
| `ogImageSrc`                  | no       | Dedicated **1200×630** social image (falls back to `hero.imageSrc`).                          |
| `primaryCta` / `secondaryCta` | yes      | Button labels.                                                                                |
| `hero`                        | yes      | `eyebrow`, `headline`, `subheadline`, `imageSrc`, `imageAlt`.                                 |
| `quickAnswer`                 | yes      | `title`, `body` — one extractable answer paragraph.                                           |
| `socialStoryExplainer`        | no       | `title`, `body[]` — definitional explainer.                                                   |
| `intro` / `whyThisFits`       | yes      | `title`, `body[]` two-column blocks.                                                          |
| `carefulBenefits`             | yes      | `title`, `items[]` (5 statements).                                                            |
| `useCases`                    | no       | `title`, optional `intro`, `items[]` of `{ title, body }` concrete scenarios.                 |
| `books`                       | yes      | 5 example concept cards. **`imageAlt` must match the title printed on the cover image.**      |
| `process` / `formats`         | yes      | `title` + `steps[]` / `items[]`.                                                              |
| `forProfessionals`            | no       | `title`, `body[]`, `ctaLabel`, optional `ctaHref` (defaults to the localized `contactUs`).    |
| `glossary`                    | no       | `title`, `terms[]` of `{ term, definition }`.                                                 |
| `faq`                         | yes      | `{ question, answer }[]` — also emitted as `FAQPage` JSON-LD.                                 |
| `safetyNote`                  | yes      | `title`, `body` disclaimer.                                                                   |
| `finalCta`                    | yes      | `title`, `body`.                                                                              |

Optional sections render **only when present**, so the template stays reusable across future pages.

---

## SEO & Structured Data

`generateMetadata()` in the route emits:

- `title`, `description`.
- `robots`: `index,follow,max-snippet:-1,max-image-preview:large` when `indexable`, else `noindex,nofollow`.
- Canonical via `buildLocalizedUrl(locale, '/lp/' + slug)`.
- Reciprocal hreflang links for every indexable member of the same `translationKey` family.
- OpenGraph + Twitter (`summary_large_image`) using `ogImageSrc ?? hero.imageSrc` at **1200×630**.

`buildStructuredData()` in the template injects one `<script type="application/ld+json">` with an array of:

- **BreadcrumbList** — Mythoria → page (`breadcrumbLabel`).
- **WebPage** — `inLanguage`, `dateModified` (from `updatedAt`), `publisher` (Mythoria Organization),
  `primaryImageOfPage`, and `about` Thing entities (the page's topics).
- **Service** — the Mythoria offering (provider, `areaServed`, `serviceType`).
- **HowTo** — built from `process.steps`.
- **FAQPage** — built from `faq`.

**Sitemap:** indexable landing pages are pulled automatically by the sitemap route via
`getIndexableLandingPages()`, using `updatedAt` as `lastmod`. No sitemap code change is needed when you
add a page.

### GEO (GenAI / answer-engine) notes

- Lead with a concise, self-contained **quick answer**; use **question-shaped** headings in the FAQ,
  use cases, and explainer.
- Keep definitions plain and factual (glossary + `about` entities ground the page for AI engines).
- Surface a visible **updated date** and accurate publisher/author signals (E-E-A-T).

---

## Assets

Use a strict source/runtime split:

```
src/content/landing-pages/<name>.<locale>.ts        # canonical runtime content
docs/landing-pages/{slug}/                          # briefs, research, prompts, source JSON
public/landing-pages/{slug}/assets/                 # only files that must be publicly served
├── hero/
│   ├── <hero-image>                                # in-page hero (any ratio)
│   └── og-cover.*                                  # 1200×630 social image referenced by ogImageSrc
├── books/
│   └── <book-slug>.*                               # example book card artwork
└── audio/
    └── <book-slug>.*                               # optional sample audio files
```

Translated media lives under
`public/landing-pages/{pt-source-slug}/assets/i18n/{locale}/`. Generate 30–60 second localized TTS
samples with `npm run landing-assets:generate-audio` (optional filters: `-- --locale en-US` and
`--translation-key family-travel`) and validate all expected images, MP3 files and manifests with
`npm run landing-assets:validate`. Credentials are read from `.env.local` and are never written to
manifests.

Do **not** create or reference `public/landing-page-assets/`; that folder is deprecated.

> The cover images carry **printed titles** when using rendered cover artwork. The content `title`
> and `imageAlt` for each book MUST match the title represented by the asset — otherwise the card
> text contradicts the visual. (`landing-pages.test.ts` asserts `imageAlt` contains the book `title`.)

### Localization rules for stories and artwork

- Localize fictional character names for the target market, not only the surrounding prose. Use
  names that feel natural in the target locale and keep the chosen names consistent in the title,
  synopsis, excerpt, sample chapter, audio script, alt text, cover and feature artwork.
- Adapt the setting when it is relevant: cities, public spaces, travel routes, food, seasons and
  cultural references should belong naturally to the target country. A neutral setting may remain
  neutral when no regional detail improves the story.
- Keep a Portuguese name or setting only when Portuguese identity, heritage or diaspora is an
  intentional part of the story. Document that choice editorially so it cannot be mistaken for an
  untranslated residue.
- Before approving localized artwork, compare every printed name and place with the canonical
  localized content. Regenerate the audio whenever a name, setting or title changes.

---

## How to Add a New Landing Page

1. **Create the content file:** `src/content/landing-pages/<name>.<locale>.ts` exporting a
   `LandingPageContent` object. Reuse the family's `translationKey`; keep `primaryIntent` stable
   across translations.
2. **Add public runtime assets** under `public/landing-pages/{slug}/assets/{hero,books,audio}/`, including a 1200×630
   `og-cover.*` when social sharing needs a dedicated image.
3. **Move editorial/source artifacts** (briefs, prompts, draft JSON, checklists, research notes) to
   `docs/landing-pages/{slug}/` so they are not served as public app assets.
4. **Register it** in `src/content/landing-pages/index.ts` (import + add to the `landingPages` array).
5. **Set `indexable`** (`true` to publish to search + sitemap).
6. **Build** — the route, metadata, structured data, and sitemap entry are generated automatically.
7. **Extend `landing-pages.test.ts`** if the page introduces new editorial guarantees.

---

## Editorial Guardrails

- **Be respectful and precise with sensitive topics.** Lead titles/headings with respectful technical
  terms; keep softer keyword variants in the body/FAQ for SEO. (The PEA/PHDA page leads with the
  acronyms and keeps "autismo" only as a body/FAQ keyword.)
- **Never claim clinical, medical, therapeutic, or diagnostic value.** Always include the safety note
  and frame the product as a **complementary** creative tool.
- **Examples are fictional concepts**, not testimonials — keep the "Exemplos ficcionais" framing honest.
- **Localization is editorial adaptation, not word replacement.** Localize character names and,
  where relevant, the setting and cultural context. Apply those choices to every textual, audio and
  visual occurrence before marking the locale indexable.

---

## Files to Know (Quick Map)

- **Content type:** `src/content/landing-pages/types.ts`
- **Example content:** `src/content/landing-pages/autism-stories.pt-PT.ts`
- **Registry:** `src/content/landing-pages/index.ts`
- **Template + JSON-LD:** `src/components/landing-pages/LandingPageTemplate.tsx`
- **Route + metadata:** `src/app/[locale]/lp/[slug]/page.tsx`
- **Tests:** `src/content/landing-pages/landing-pages.test.ts`
- **Runtime assets:** `public/landing-pages/{slug}/assets/`
- **Editorial/source artifacts:** `docs/landing-pages/{slug}/`
- **SEO helpers:** `src/lib/seo.ts`
