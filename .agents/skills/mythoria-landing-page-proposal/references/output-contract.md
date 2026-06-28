# Output Contract

Each proposal folder must live under:

```text
public/landing-pages/{slug}/
```

For the Mythoria web app repository, use:

```text
mythoria-webapp/public/landing-pages/{slug}/
```

## Required Files

```text
manifest.json
research-report.md
page.md
seo-brief.json
books.json
image-prompts.json
audio-samples.json
story-generation-plan.json
review-checklist.md
implementation-notes.md
assets/covers/book-01-cover.prompt.md
assets/covers/book-02-cover.prompt.md
assets/covers/book-03-cover.prompt.md
assets/covers/book-04-cover.prompt.md
assets/covers/book-05-cover.prompt.md
assets/use-cases/book-01-use-case.prompt.md
assets/use-cases/book-02-use-case.prompt.md
assets/use-cases/book-03-use-case.prompt.md
assets/use-cases/book-04-use-case.prompt.md
assets/use-cases/book-05-use-case.prompt.md
```

Do not create final `.png`, `.jpg`, `.mp3`, `.wav`, `.m4a`, or `.pdf` assets in this folder. Use prompt/spec files only.

## Manifest

`manifest.json` is the source of truth. Required fields:

```json
{
  "schemaVersion": "1.0",
  "status": "draft",
  "locale": "pt-PT",
  "slug": "",
  "title": "",
  "primaryIntent": "",
  "mappedExistingIntent": null,
  "targetCountry": "Portugal",
  "primaryGoal": "first_story_completed",
  "secondaryGoal": "account_creation",
  "primaryPersona": "",
  "secondaryPersonas": [],
  "recipientTypes": [],
  "riskRating": "green",
  "sensitiveNiche": false,
  "requiresHumanApproval": true,
  "requiresExternalExpertReview": false,
  "createdAt": "YYYY-MM-DD",
  "updatedAt": "YYYY-MM-DD"
}
```

Allowed statuses: `draft`, `needs_review`, `approved`, `published`, `retired`.

Allowed risk ratings: `green`, `yellow`, `red`.

## Page Markdown

`page.md` must have frontmatter with title, meta fields, slug, locale, status, risk rating, primary intent, and goals. Recommended structure:

```markdown
# H1
## Hero
## O que é a Mythoria?
## Porque faz sentido para este caso
## Como uma história personalizada pode ajudar
## Resposta rápida
## Exemplos de livros
## Como funciona
## Formatos disponíveis
## Perguntas frequentes
## Nota de confiança e segurança
## CTA final
```

## Books

`books.json` must contain exactly five books in `books`. Every book needs:

- `id` from `book-01` to `book-05`
- title, slug, niche, target audience, reader age band, buyer persona, recipient type, story intent
- synopsis, short excerpt, emotional job
- existing Mythoria `graphicalStyle` token
- existing Mythoria `novelStyle` token
- fictional user context
- cover and use-case image prompt paths
- audio sample text
- public story preparation fields
- safety notes

## Image And Audio

`image-prompts.json` and prompt Markdown files must describe future generation only. Prompts should show finished books, reading moments, listening moments, or product shots. Avoid abstract tech visuals, clinical imagery, real children, and real personal data.

`audio-samples.json` must include one entry per book, with teaser text and voice direction. Calmer niches require calmer rhythm.

## Story Generation Plan

`story-generation-plan.json` must include one planned public story per book. `makePublic` may be `true` in the plan, but the status must imply manual review before creation/publication. `featureInGetInspired` defaults to `false`.

## Review Checklist

Include sections for page quality, brand and voice, safety, SEO, and approval.
