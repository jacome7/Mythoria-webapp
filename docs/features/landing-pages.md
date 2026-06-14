# Landing Pages (SEO/GEO Campaign Pages)

## Purpose

The landing-page engine renders focused, SEO- and GenAI-optimized marketing pages under
`/{locale}/lp/{slug}` (e.g. `/pt-PT/lp/livro-personalizado-criancas-autistas`). Each page targets a
specific intent or niche (a topic, audience, or use case), is written directly in one locale, and is
assembled from a single **typed content object** rendered by one shared template. There is no CMS —
content is version-controlled TypeScript.

The engine is built so a new page is **content only**: author a content file, drop in assets,
register it. The template, metadata, structured data, and sitemap inclusion are handled for you.

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
- **URL:** `/{locale}/lp/{slug}` — the canonical locale must match the content's `locale`; a mismatch
  triggers a `permanentRedirect` to the correct locale.
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
        │   getLandingPageBySlug() / getIndexableLandingPages() / getLandingPageStaticParams()
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

Store assets under `public/landing-page-assets/{slug}/`:

```
public/landing-page-assets/{slug}/
├── hero/
│   ├── <hero-image>           # in-page hero (any ratio)
│   └── og-cover.jpg           # 1200×630 social image referenced by ogImageSrc
└── books/
    └── book-0N-*-cover.*      # five example covers
```

> The cover images carry **printed titles**. The content `title` and `imageAlt` for each book MUST
> match the title on the image — otherwise the card text contradicts the cover. (`landing-pages.test.ts`
> asserts `imageAlt` contains the book `title`.)

---

## How to Add a New Landing Page

1. **Create the content file:** `src/content/landing-pages/<name>.<locale>.ts` exporting a
   `LandingPageContent` object. Use the `assetBase = /landing-page-assets/${slug}` pattern.
2. **Add assets** under `public/landing-page-assets/{slug}/{hero,books}/`, including a 1200×630
   `og-cover.jpg`.
3. **Register it** in `src/content/landing-pages/index.ts` (import + add to the `landingPages` array).
4. **Set `indexable`** (`true` to publish to search + sitemap).
5. **Build** — the route, metadata, structured data, and sitemap entry are generated automatically.
6. **Extend `landing-pages.test.ts`** if the page introduces new editorial guarantees.

---

## Editorial Guardrails

- **Be respectful and precise with sensitive topics.** Lead titles/headings with respectful technical
  terms; keep softer keyword variants in the body/FAQ for SEO. (The PEA/PHDA page leads with the
  acronyms and keeps "autismo" only as a body/FAQ keyword.)
- **Never claim clinical, medical, therapeutic, or diagnostic value.** Always include the safety note
  and frame the product as a **complementary** creative tool.
- **Examples are fictional concepts**, not testimonials — keep the "Exemplos ficcionais" framing honest.

---

## Files to Know (Quick Map)

- **Content type:** `src/content/landing-pages/types.ts`
- **Example content:** `src/content/landing-pages/autism-stories.pt-PT.ts`
- **Registry:** `src/content/landing-pages/index.ts`
- **Template + JSON-LD:** `src/components/landing-pages/LandingPageTemplate.tsx`
- **Route + metadata:** `src/app/[locale]/lp/[slug]/page.tsx`
- **Tests:** `src/content/landing-pages/landing-pages.test.ts`
- **Assets:** `public/landing-page-assets/{slug}/`
- **SEO helpers:** `src/lib/seo.ts`
