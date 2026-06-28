---
name: mythoria-landing-page-proposal
description: Generate complete Mythoria niche landing-page proposal folders with pt-PT content specifications, SEO briefs, sample book concepts, image prompts, audio sample text, story-generation plans, safety review notes, and validation. Use when Codex is asked to draft, create, review, or regenerate a content-only proposal under public/landing-pages/{slug} for a Mythoria search or creation intent, without creating production routes, publishing pages, calling Mythoria APIs, generating final images, or generating audio files.
---

# Mythoria Landing Page Proposal

## Purpose

Create content-only proposal packs for high-intent Mythoria landing pages. The output is a draft folder of Markdown, JSON, and prompt files that can be reviewed before any implementation or publication work.

## Required References

Before generating or reviewing a proposal, read:

- `references/output-contract.md` for required files, schemas, and folder layout.
- `references/safety-rules.md` for claim boundaries and risk ratings.
- `references/mythoria-voice.md` for pt-PT brand voice and CTA rules.

When selecting or comparing niches, also read `references/first-batch-niches.md`.

## Workflow

1. Identify the target service. For Mythoria web landing-page proposal artifacts, use `mythoria-webapp/public/landing-pages/{slug}/` unless the user specifies another service-local `public` folder.
2. Parse the niche as a search or creation intent, not a persona. Convert it into:
   - `slug`
   - `primaryIntent`
   - `primaryPersona`
   - `secondaryPersonas`
   - `recipientTypes`
3. Check existing Mythoria graphical and novel style tokens before choosing styles. Prefer `story-generation-workflow/src/prompts/imageStyles.json` and the Drizzle enum snapshots as canonical sources.
4. Research search intent when browsing or source context is available. Keep the report concise and avoid pretending search-volume data exists unless a source provides it.
5. Assign a risk rating:
   - `yellow` for child, neurodivergence, grief, memory, school, or health-adjacent pages.
   - `green` for low-risk commercial pages.
   - `red` only when the niche should not proceed without rewriting.
6. Generate every required output file and exactly five fictional sample book concepts.
7. Write public-facing page copy in European Portuguese (`pt-PT`), with warm but careful wording.
8. Store prompts/specs only. Do not create routes, call APIs, publish, index, update sitemap, generate final images, or generate audio.
9. Run `scripts/validate-landing-page-output.mjs <proposal-folder>` and fix validation failures.
10. Return a concise summary with files created and unresolved warnings.

## Content Rules

- Lead with emotional and practical outcomes, not AI mechanics.
- Use CTAs such as `Começar a minha história`, `Criar uma história`, or `Transformar esta memória num livro`.
- Avoid `gerar com IA` as public-facing CTA copy.
- Do not invent testimonials, customer counts, ratings, awards, or clinical proof.
- Do not use real child data. Sample contexts must be fictional and clearly non-testimonial.
- Include tracking recommendations in `implementation-notes.md`; do not implement analytics.

## Validation

Run:

```bash
node .agents/skills/mythoria-landing-page-proposal/scripts/validate-landing-page-output.mjs mythoria-webapp/public/landing-pages/{slug}
```

The validator checks required files, JSON parseability, key manifest fields, slug/status/risk values, exactly five books, prompt-file coverage, audio sample text, forbidden claims, and absence of final media assets.
