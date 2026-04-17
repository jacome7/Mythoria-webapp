# Feature 06 - Story Listening and Audiobook

Status: Implemented (core MCP backend complete)

## Description

This feature enables in-chat listening and audiobook generation flows for Mythoria stories.

Primary goals:

- Check audiobook readiness and listening status.
- Retrieve chapter-level audio stream URLs.
- Trigger real audiobook generation with credit checks and explicit confirmation.
- Expose available narrator voices from the active TTS provider.

## Workflow

1. User asks to listen to a story.
2. Assistant calls `mythoria.story.audio_status`.
3. If audio exists, assistant calls `mythoria.story.audio_chapter`.
4. If audio is missing, assistant calls `mythoria.story.voice_catalog`.
5. Assistant calls `mythoria.story.narration_request` (preview mode, then confirmed mode).
6. Assistant follows up with `mythoria.story.audio_status` until audio becomes available.

## Communication examples

1. User: "Play Moon Garden."

- Assistant: checks `audio_status`, then returns chapter stream via `audio_chapter`.

2. User: "Generate audiobook with coral voice."

- Assistant: checks credits and asks for confirmation.
- Assistant: calls `narration_request` with `confirmStart=true` after user confirms.

3. User: "Is it ready now?"

- Assistant: calls `audio_status` and reports generation status and available chapters.

4. User: "Give me chapter 3 audio."

- Assistant: calls `audio_chapter` with `chapterNumber=3`.

## Dependencies

- Existing services:
- `storyService.getStoryById`
- `storyService.getStoryBySlug`
- `chapterService.getStoryChapters`
- `pricingService.getPricingByServiceCode`
- `creditService.getAuthorCreditBalance`
- `creditService.deductCredits`
- `creditService.addCredits` (refund path)
- Existing workflow publisher:
- `publishAudiobookRequest` from `src/lib/pubsub.ts`
- Feature 02 OAuth challenge behavior for private story access.
- Existing audio proxy routes:
- `/api/stories/{storyId}/audio/{chapterIndex}`
- `/api/p/{slug}/audio/{chapterIndex}`

## Implemented

### Tools

Implemented in `src/lib/mcp/server.ts`:

- `mythoria.story.voice_catalog`
- `mythoria.story.audio_status`
- `mythoria.story.audio_chapter`
- `mythoria.story.narration_request` (upgraded to real workflow + credit handling)

### Access model

- `voice_catalog` is public (`noauth`).
- `audio_status` and `audio_chapter` support mixed access:
- noauth for public stories via `slug`
- OAuth challenge for private stories (`mythoria.account.read`)
- `narration_request` remains authenticated (`mythoria.story.narrate`) and owner-scoped.

### Listening behavior

- `audio_status` returns:
- audiobook generation status (`not_started`, `generating`, `completed`, `failed`)
- available audio chapter numbers
- chapter-level stream metadata when requested
- listen/read URLs for owner/public contexts
- `audio_chapter` returns:
- chapter stream URL for private playback
- public stream URL when story is public
- clear `audio_not_available` guidance when chapter audio is missing
- `voice_catalog` returns:
- configured TTS provider
- default voice
- available voice IDs with localization key references

### Narration generation behavior

- `narration_request` now:
- validates published status + story ownership
- validates voice against configured provider
- supports dry-run/preview and explicit confirmation (`confirmStart`)
- checks and deducts `audioBookGeneration` credits
- queues real Pub/Sub audiobook workflow with `runId`
- refunds credits and resets status if queue publish fails

### Validation

- Updated unit tests in `src/lib/mcp/server.test.ts`:
- audio status success
- public slug chapter playback lookup
- private audio auth challenge
- narration preview and confirmed queue behavior
- voice catalog noauth behavior
- Updated tool metadata assertions for new listening tools.
- Updated Playwright MCP metadata checks in `tests/playwright/mcp.spec.ts`.

## Still missing / follow-up

1. Embedded listening widget:

- Core listening widget surface is now implemented in Feature 11.
- Advanced playback controls and richer visual polish remain a follow-up.

## Screenshot recommendations

1. Voice catalog:

- `mythoria.story.voice_catalog` returning provider/default voice/options.

2. Audio status available:

- `mythoria.story.audio_status` with chapter entries and stream URLs.

3. Audio chapter retrieval:

- `mythoria.story.audio_chapter` success response.

4. Narration preview:

- `mythoria.story.narration_request` with `status=confirmation_required`.

5. Narration queued:

- `mythoria.story.narration_request` with `status=queued` and `runId`.

## Copy templates

### Audio available template

- "Audio is available for chapters {chapters}. Tell me which chapter you want to play."

### Audio missing template

- "This story has no audiobook yet. I can generate it now and it will use {credits} credits."

### Confirmation template

- "Generating the audiobook will spend {credits} credits. Should I start now?"

### Queued template

- "Audiobook generation is queued (runId: {runId}). I can check status in a follow-up turn."

## Acceptance targets

1. Authenticated users can complete listen flow from status check to chapter stream retrieval.
2. Narration start uses real credits and real queue publish, not synthetic placeholders.
3. Public slug listening lookups work without auth for public stories.
