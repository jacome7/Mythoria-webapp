---
name: mythoria-sample-book-generator
description: Generate complete fictional Mythoria sample-book packs for homepage modules, Get Inspired surfaces, SEO landing pages, product demos, or campaign pages. Use when Codex is asked to create, review, regenerate, or prepare a Mythoria sample book with title, target audience, language, synopsis, excerpt/sample chapter, cover image, photorealistic feature image, optional Gemini TTS audio teaser, and published landing-page assets in Google Cloud Storage.
---

# Mythoria Sample Book Generator

## Overview

Create one complete fictional sample-book pack that can be featured in Mythoria web experiences. Each pack combines structured metadata, public-safe story copy, reusable image prompts, generated cover/feature media, a short audio teaser, review notes, and public asset URLs hosted in Google Cloud Storage.

## Required References

Before creating or reviewing a sample book, read:

- `references/output-contract.md` for required files, schemas, and folder layout.
- `references/image-guidance.md` for `gpt-image-2`, cover, and feature-photo rules.
- `references/safety-rules.md` for fictionalization, sensitive niches, and claim limits.

Also inspect these repo sources before selecting tokens:

- `story-generation-workflow/src/prompts/imageStyles.json`
- `story-generation-workflow/src/db/schema/enums.ts`
- `story-generation-workflow/src/prompts/audio/{language}.json` when the requested language has one.

## Workflow

1. Identify the sample-book purpose: homepage, Get Inspired, SEO landing page, product demo, or campaign.
2. Create or normalize:
   - `slug`
   - `title`
   - `language`
   - `targetAudience`
   - `novelStyle`
   - `graphicalStyle`
   - `placement`
   - `usageTags`
3. Use only canonical Mythoria `targetAudience`, `novelStyle`, and `graphicalStyle` tokens. If the requested language is outside `en-US`, `pt-PT`, `es-ES`, `fr-FR`, and `de-DE`, allow it but set `experimentalLanguage: true`.
4. Write public-facing narrative content in the requested language:
   - concise synopsis
   - short card excerpt
   - 600-900 word sample chapter unless the user asks for another length
   - 30-60 second audio teaser text
5. Create prompts in English for both images:
   - `cover`: cover art only, using the selected Mythoria graphical style.
   - `feature`: photorealistic photograph of the physical book in a real-world scene, using the generated cover as a visual reference whenever available.
6. Generate `assets/cover.jpeg` with Codex image generation using `gpt-image-2` guidance and the selected `graphicalStyle`.
7. Generate `assets/feature.jpeg` with Codex image generation using the cover image as a reference. The result must look like a real product/lifestyle photograph.
8. Generate `assets/audio-teaser.mp3` by running `scripts/generate-sample-audio.mjs <sample-book-folder>` when SGW Gemini TTS credentials are available. If credentials are unavailable, leave `audio-sample.json.status` as `pending_generation` and explain why.
9. Run `scripts/validate-sample-book-output.mjs <sample-book-folder>` and fix validation failures.
10. Upload every generated file under `<sample-book-folder>/assets` to Google Cloud Storage:
    - Bucket: `mythoria-public`
    - Object prefix: `landing-page-assets/sample-books/{slug}/assets/`
    - Public base URL: `https://storage.googleapis.com/mythoria-public/landing-page-assets/sample-books/{slug}/assets/`
11. Record the uploaded asset URLs in the relevant metadata files before final delivery:
    - `book.json.coverImage.publicUrl`
    - `book.json.featureImage.publicUrl`
    - `book.json.audioSample.publicUrl` when audio was generated
    - each generated entry in `image-prompts.json`
    - `audio-sample.json.publicUrl` when audio was generated
12. If `gcloud` is unavailable, unauthenticated, misconfigured, lacks permission, or the upload fails after retrying once, do not block completion. Copy the same generated assets to `tmp/landing-page-assets/sample-books/{slug}/assets/`, report the absolute fallback folder, and state that the files still need manual upload.
13. Run validation again after URL metadata updates where possible.
14. Return a concise summary with files created, generated assets, GCS URLs or fallback folder, and unresolved warnings.

## Content Rules

- Make every sample fictional. Do not imply a real customer, child, testimonial, rating, award, or production story exists.
- Keep the Mythoria voice direct, clear, warm, and lightly playful. Use poetic detail sparingly.
- Lead with the value of the book, not the AI mechanism.
- Never use private user data or real child details in a public sample.
- For child, school, neurodivergence, grief, memory, or health-adjacent contexts, set `riskRating: "yellow"` and include careful safety notes.
- Do not claim Mythoria diagnoses, treats, improves behavior, replaces professional support, or guarantees outcomes.
- Keep image prompts family-safe: fully clothed people, supervised settings for children, no intimate framing, no medical/clinical staging unless explicitly necessary and safe.

## Validation

Run:

```bash
node .agents/skills/mythoria-sample-book-generator/scripts/validate-sample-book-output.mjs mythoria-webapp/public/sample-books/{slug}
```

For audio:

```bash
node .agents/skills/mythoria-sample-book-generator/scripts/generate-sample-audio.mjs mythoria-webapp/public/sample-books/{slug}
```

The validator checks required files, schema shape, canonical tokens, media presence, prompt coverage, audio metadata, fictionalization flags, and forbidden claims.

## Publishing Assets

Use `gcloud` from the repository root after generation and validation. Prefer `gcloud storage rsync` so the GCS folder mirrors the local `assets` folder without introducing an extra directory level:

```powershell
$Slug = "{slug}"
$SampleBookFolder = "public/sample-books/$Slug"
$LocalAssets = "$SampleBookFolder/assets"
$GcsAssets = "gs://mythoria-public/landing-page-assets/sample-books/$Slug/assets"

gcloud storage rsync --recursive $LocalAssets $GcsAssets
```

The expected public URLs are:

```text
https://storage.googleapis.com/mythoria-public/landing-page-assets/sample-books/{slug}/assets/cover.jpeg
https://storage.googleapis.com/mythoria-public/landing-page-assets/sample-books/{slug}/assets/feature.jpeg
https://storage.googleapis.com/mythoria-public/landing-page-assets/sample-books/{slug}/assets/audio-teaser.mp3
```

Audio URL metadata is required only when `assets/audio-teaser.mp3` exists. Prompt files under `assets/prompts/` should also be uploaded and may be referenced from internal metadata as public URLs when useful for review or regeneration.

If upload fails, create the fallback folder and preserve the same relative layout:

```powershell
$FallbackAssets = "tmp/landing-page-assets/sample-books/$Slug/assets"
New-Item -ItemType Directory -Force $FallbackAssets | Out-Null
Copy-Item -Recurse -Force "$LocalAssets/*" $FallbackAssets
```
