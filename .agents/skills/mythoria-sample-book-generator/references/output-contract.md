# Output Contract

Each sample-book pack must live under:

```text
mythoria-webapp/public/sample-books/{slug}/
```

## Required Files

```text
manifest.json
book.json
sample-chapter.md
image-prompts.json
audio-sample.json
review-checklist.md
assets/cover.jpeg
assets/feature.jpeg
assets/prompts/cover.prompt.md
assets/prompts/feature.prompt.md
```

`assets/audio-teaser.mp3` is required after audio generation. It may be absent only when `audio-sample.json.status` is `pending_generation` or `blocked`.

All generated files under `assets/` must also be published to:

```text
gs://mythoria-public/landing-page-assets/sample-books/{slug}/assets/
https://storage.googleapis.com/mythoria-public/landing-page-assets/sample-books/{slug}/assets/
```

If publishing fails because `gcloud` is unavailable, unauthenticated, misconfigured, or lacks permission, copy the generated assets to:

```text
mythoria-webapp/tmp/landing-page-assets/sample-books/{slug}/assets/
```

Keep the same relative layout as `assets/` so the folder can be manually uploaded later.

## Manifest

`manifest.json` is the source of truth:

```json
{
  "schemaVersion": "1.0",
  "status": "draft",
  "slug": "sample-book-slug",
  "title": "Sample Book Title",
  "language": "pt-PT",
  "experimentalLanguage": false,
  "placement": "homepage",
  "usageTags": ["homepage", "seo"],
  "riskRating": "green",
  "sensitiveNiche": false,
  "requiresHumanApproval": true,
  "createdAt": "YYYY-MM-DD",
  "updatedAt": "YYYY-MM-DD"
}
```

Allowed statuses: `draft`, `needs_review`, `approved`, `published`, `retired`.

Allowed risk ratings: `green`, `yellow`, `red`.

Core Mythoria locales are `en-US`, `pt-PT`, `es-ES`, `fr-FR`, and `de-DE`. Other BCP-47-like language codes are allowed, but must set `experimentalLanguage: true`.

## Book

`book.json` must include:

- `id`
- `title`
- `slug`
- `language`
- `targetAudience`
- `readerAgeBand`
- `buyerPersona`
- `recipientType`
- `storyIntent`
- `synopsis`
- `shortExcerpt`
- `sampleChapterPath`
- `audioTeaserText`
- `graphicalStyle`
- `novelStyle`
- `fictionalUserContext`
- `coverImage`
- `featureImage`
- `audioSample`
- `safetyNotes`

`targetAudience`, `novelStyle`, and `graphicalStyle` must use canonical Mythoria tokens.

`fictionalUserContext` must clearly describe a fictional scenario and must not read as a real testimonial.

`coverImage`, `featureImage`, and generated `audioSample` entries should include both local and published asset information:

```json
{
  "localPath": "assets/cover.jpeg",
  "gcsUri": "gs://mythoria-public/landing-page-assets/sample-books/sample-book-slug/assets/cover.jpeg",
  "publicUrl": "https://storage.googleapis.com/mythoria-public/landing-page-assets/sample-books/sample-book-slug/assets/cover.jpeg"
}
```

When `audio-sample.json.status` is `pending_generation` or `blocked`, omit `audioSample.gcsUri` and `audioSample.publicUrl` unless an audio file was actually uploaded.

## Sample Chapter

`sample-chapter.md` should contain frontmatter with `title`, `slug`, `language`, `targetAudience`, `novelStyle`, and `graphicalStyle`.

Default length is 600-900 words unless the user requested a different format. Keep the chapter polished enough to be read publicly, but mark it as fictional sample content through metadata and review notes.

## Image Prompts

`image-prompts.json` must contain exactly two image prompt entries:

- `cover`
- `feature`

Each entry must include `promptPath`, `targetPath`, `status`, `model`, `size`, and `quality`.

For generated image entries, also include:

- `gcsUri`
- `publicUrl`

Prompt Markdown files should be directly usable by Codex image generation and should include enough detail for a future agent to regenerate the assets.

## Audio

`audio-sample.json` must include:

- `status`: `pending_generation`, `generated`, or `blocked`
- `targetPath`: `assets/audio-teaser.mp3`
- `text`
- `voiceDirection`
- `language`
- `provider`
- `model`
- `voice`
- `recommendedDurationSeconds`
- `generatedAt` when generated
- `gcsUri` when generated and uploaded
- `publicUrl` when generated and uploaded

The audio text should be a 30-60 second teaser by default.

## Review Checklist

Include checks for story quality, brand voice, safety, token validity, image quality, cover-feature consistency, audio quality, and publication readiness.
