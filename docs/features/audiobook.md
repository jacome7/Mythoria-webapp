# Audiobook

## User Experience

### Listen to Your Own Stories (Authenticated)

1. **Open the Listen view** from your story actions. The Listen page is available only to signed-in users and requires the story to be published. If the story is still a draft, the page explains that the story is not available yet. 【F:src/app/[locale]/stories/listen/[storyId]/page.tsx†L128-L262】
2. **If audio already exists**, the page shows a chapter list with artwork, duration, and playback controls (play/pause, timeline scrubbing, and playback speed). The player supports chapter-by-chapter listening and automatically advances to the next chapter after one finishes. 【F:src/app/[locale]/stories/listen/[storyId]/page.tsx†L526-L571】【F:src/components/AudioPlayer/AudioChapterList.tsx†L41-L206】【F:src/components/AudioPlayer/useAudioPlayer.ts†L21-L182】
3. **If audio does not exist**, the page prompts you to generate an audiobook. You select a narrator voice, toggle background music, review credit cost vs. balance, and start generation. If credits are insufficient, the UI shows the shortfall and links to pricing. 【F:src/app/[locale]/stories/listen/[storyId]/page.tsx†L662-L793】
4. **During generation**, the page displays a progress state and polls every 15 seconds until audio becomes available. 【F:src/app/[locale]/stories/listen/[storyId]/page.tsx†L269-L318】【F:src/app/[locale]/stories/listen/[storyId]/page.tsx†L606-L734】
5. **Re-narration** is available even when audio exists. Users can pick a new voice, re-toggle background music, see updated cost, and regenerate the audiobook. The new narration replaces the existing one. 【F:src/app/[locale]/stories/listen/[storyId]/page.tsx†L526-L661】

### Listen to Public Stories (Anonymous)

1. **Public listeners** access `/p/[slug]/listen` without authentication. The page fetches public story data and determines if audio exists. 【F:src/app/[locale]/p/[slug]/listen/page.tsx†L52-L146】
2. **If audio exists**, the same chapter player UI is used, including the chapter list and playback controls. 【F:src/app/[locale]/p/[slug]/listen/page.tsx†L189-L203】【F:src/components/AudioPlayer/AudioChapterList.tsx†L41-L206】
3. **If audio is missing**, the page shows a friendly “audio not available” message with a button back to the story. 【F:src/app/[locale]/p/[slug]/listen/page.tsx†L200-L213】

### Cast Audio to Devices

Both authenticated and public Listen pages show a Cast bar when the Cast SDK is available. Users can choose a device, see casting status, and stop casting at any time. When casting stops, local playback resumes from the previous position. 【F:src/components/AudioPlayer/AudioChapterList.tsx†L47-L74】【F:src/components/AudioPlayer/useCastAudioPlayer.ts†L121-L232】【F:src/components/AudioPlayer/useCastAudioPlayer.ts†L278-L469】

---

## Developer Implementation

### Key Entry Points

- **Authenticated Listen page**: `src/app/[locale]/stories/listen/[storyId]/page.tsx` loads story data, chapters, credits, and pricing; also orchestrates generation and playback. 【F:src/app/[locale]/stories/listen/[storyId]/page.tsx†L116-L734】
- **Public Listen page**: `src/app/[locale]/p/[slug]/listen/page.tsx` loads the public story and renders the same audio player UI when audio is available. 【F:src/app/[locale]/p/[slug]/listen/page.tsx†L52-L203】
- **Audio player UI**: `src/components/AudioPlayer/AudioChapterList.tsx` renders per-chapter controls, timeline scrubbing, and speed selection. 【F:src/components/AudioPlayer/AudioChapterList.tsx†L41-L206】
- **Local playback engine**: `src/components/AudioPlayer/useAudioPlayer.ts` manages HTMLAudioElement instances, progress, auto-advance, and error handling. 【F:src/components/AudioPlayer/useAudioPlayer.ts†L1-L237】
- **Cast playback engine**: `src/components/AudioPlayer/useCastAudioPlayer.ts` loads the Cast SDK, builds queue items from chapter audio URIs, and syncs local + remote state. 【F:src/components/AudioPlayer/useCastAudioPlayer.ts†L1-L687】

### Audiobook Data Model & Formats

- **Story-level audio** lives in `story.audiobookUri` (JSONB). It can be either:
  - an array of `{ chapterTitle, audioUri, duration, imageUri }` objects, or
  - a map of chapter keys (`chapter_1`, `1`, etc.) to audio URLs.
- **Chapter-level audio** uses `chapter.audioUri` for per-chapter audio URLs (preferred for public pages).
- The authenticated story API normalizes `audiobookUri` into a consistent array for the frontend. 【F:src/app/api/stories/[storyId]/route.ts†L1-L126】
- Utility helpers `hasAudiobook` and `getAudioChapters` detect formats and merge chapter titles/images from the database. 【F:src/components/AudioPlayer/utils.ts†L15-L135】

### Generation Workflow (Audio Conversion)

1. The Listen page calls **`POST /api/stories/{storyId}/generate-audiobook`** with `voice` and `includeBackgroundMusic`. 【F:src/app/[locale]/stories/listen/[storyId]/page.tsx†L320-L378】
2. The API validates ownership + published status, checks the credit balance, deducts credits, and sets `audiobookStatus = generating`. 【F:src/app/api/stories/[storyId]/generate-audiobook/route.ts†L15-L86】
3. A Pub/Sub message is published to trigger the async narration workflow. If publishing fails, the API rolls back the story status and refunds credits. 【F:src/app/api/stories/[storyId]/generate-audiobook/route.ts†L73-L108】【F:src/lib/pubsub.ts†L3-L32】
4. The Listen page polls `/api/stories/{storyId}` every 15 seconds until the `audiobookUri` is populated. 【F:src/app/[locale]/stories/listen/[storyId]/page.tsx†L269-L318】

> Note: There is also a standalone progress UI (`AudiobookGenerationTrigger` + `AudiobookGenerationProgress`) that polls `/api/stories/{storyId}/audiobook-progress` every 3 seconds to show narration steps and simulated progress. It is currently not wired into the Listen page but is ready for reuse elsewhere. 【F:src/components/AudiobookGenerationTrigger.tsx†L1-L189】【F:src/components/AudiobookGenerationProgress.tsx†L1-L231】【F:src/app/api/stories/[storyId]/audiobook-progress/route.ts†L1-L71】

### Credit & Pricing Data

- **Credits** are fetched from `/api/my-credits` and displayed alongside the audiobook cost. 【F:src/app/[locale]/stories/listen/[storyId]/page.tsx†L216-L258】【F:src/app/api/my-credits/route.ts†L1-L38】
- **Pricing** is fetched from `/api/pricing`, which maps the audiobook option to the credit pricing configuration. 【F:src/app/[locale]/stories/listen/[storyId]/page.tsx†L216-L262】【F:src/app/api/pricing/route.ts†L1-L48】

### Audio Playback & Streaming

- **Authenticated playback** calls `/api/stories/{storyId}/audio/{chapterIndex}`. The proxy resolves `audiobookUri`, converts `gs://` URLs to HTTPS, and streams audio with cache headers. 【F:src/components/AudioPlayer/useAudioPlayer.ts†L63-L166】【F:src/app/api/stories/[storyId]/audio/[chapterIndex]/route.ts†L1-L160】
- **Public playback** calls `/api/p/{slug}/audio/{chapterIndex}`, preferring `chapter.audioUri` and falling back to `story.audiobookUri`. It applies the same URL normalization and streaming headers. 【F:src/app/api/p/[slug]/audio/[chapterIndex]/route.ts†L1-L164】

### Casting Architecture

- The Cast SDK is loaded dynamically from Google, and casting sessions are handled via the Cast framework (`RemotePlayer` + `RemotePlayerController`). 【F:src/components/AudioPlayer/useCastAudioPlayer.ts†L1-L232】
- Cast queue items are built from the chapter `audioUri` URLs (not the proxy). Metadata includes chapter titles, track numbers, and images. 【F:src/components/AudioPlayer/useCastAudioPlayer.ts†L132-L182】
- When casting stops, the hook optionally resumes local playback from the last known remote timestamp. 【F:src/components/AudioPlayer/useCastAudioPlayer.ts†L198-L232】

### Localization Touchpoints

- Voice names and descriptions are translated via the `Voices` namespace. 【F:src/messages/en-US/Voices.json†L1-L44】
- Listening labels, conversion prompts, and error messages live under `ListenStory`, `PublicStoryPage.listen`, and `Errors`. 【F:src/messages/en-US/ListenStory.json†L1-L25】【F:src/messages/en-US/PublicStoryPage.json†L31-L62】【F:src/messages/en-US/Errors.json†L1-L19】
