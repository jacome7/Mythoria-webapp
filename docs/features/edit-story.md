# Edit Story

## Overview

Edit Story is the hub for revising published stories and managing the listening experience. Authors can update chapter text, regenerate images, translate the full story, and launch audiobook narration. The same workspace also connects to listening tools where readers can play chapters, adjust speed, and cast audio to supported devices.

## End-User Experience

### 1) Open the editor

- Navigate to **My Stories** and choose **Edit** for a published story.
- The editor loads the full chapter list, making it easy to move between chapters and review existing content.

### 2) Update story content

- **Chapter text:** Edit chapter content with rich-text controls and autosave. Undo/redo uses stored version history so you can revert changes.
- **AI text revisions:** Trigger AI-assisted edits to rewrite or enhance chapter text without leaving the page.
- **Image updates:** Replace or re-generate chapter art with prompt-driven edits or by uploading a new image.
- **Full-story translation:** Launch a translation job to produce a localized copy of the full story and redirect to the translated version once ready.

### 3) Convert to audiobook

- Switch to the **Listen** view for the story.
- Review the narration cost, select a voice, and optionally include background music.
- Start audiobook generation. The UI shows progress messaging while the system builds the narration.

### 4) Listen and cast

- If narration is available, each chapter appears in a playback list with:
  - Play/pause controls
  - Progress bar and remaining time
  - Playback speed selector
- Cast controls appear when a compatible device is available. Start casting and keep playback in sync with the remote device.

## Developer Implementation Notes

### Editing + AI workflow

- **Edit page entry point:** `src/app/[locale]/stories/edit/[storyId]/page.tsx` loads story data, hydrates chapters, and coordinates text/image/translation modals.
- **Rich text editor:** `src/components/chapter-editor/ChapterEditor.tsx` wraps Lexical, autosave, and version history APIs for undo/redo.
- **AI text edits:** `src/components/AITextStoryEditor.tsx` checks credits, submits edit jobs, tracks progress, and patches updated HTML back to the chapter endpoint.
- **AI image edits:** `src/components/AIImageEditor.tsx` supports prompt-driven edits and image uploads, then applies replacements through async jobs.
- **Full-story translation:** `src/components/TranslateFullStoryModal.tsx` queues translation jobs and redirects on completion.

### Audiobook generation

- **Listen page UI:** `src/app/[locale]/stories/listen/[storyId]/page.tsx` loads story/chapters, pricing, and credits. It renders voice selection, background music toggles, and generation CTA states.
- **Generation API:** `src/app/api/stories/[storyId]/generate-audiobook/route.ts` validates ownership, verifies credit balance, deducts credits, sets `audiobookStatus`, and publishes a Pub/Sub request.
- **Progress tracking:** The listen page polls the story endpoint until `audiobookUri` is populated; `src/components/AudiobookGenerationProgress.tsx` provides a reusable progress UI backed by `/api/stories/{id}/audiobook-progress`.

### Audio playback

- **Playback UI:** `src/components/AudioPlayer/AudioChapterList.tsx` renders chapter tiles, timeline scrubbing, and speed controls.
- **Audio state:** `src/components/AudioPlayer/useAudioPlayer.ts` manages HTMLAudioElement lifecycle, progress updates, auto-advance, and playback error handling (using `Errors` translations).
- **Audio data formats:** `src/components/AudioPlayer/utils.ts` normalizes `story.audiobookUri` (array or map formats) into chapter audio objects.
- **Audio proxy endpoints:**
  - Authenticated: `src/app/api/stories/[storyId]/audio/[chapterIndex]/route.ts` authorizes access and proxies GCS audio.
  - Public: `src/app/api/p/[slug]/audio/[chapterIndex]/route.ts` resolves chapter-level audio or falls back to story-level audio.

### Casting support

- **Cast orchestration:** `src/components/AudioPlayer/useCastAudioPlayer.ts` loads the Google Cast SDK, creates a queue of chapter audio URLs, and keeps playback state in sync between the local player and cast session.
- **Cast UI:** `src/components/AudioPlayer/CastButton.tsx` exposes start/stop casting actions and device status messaging in the audio list header.

### Localization touchpoints

- Listening, casting, and error strings live in `src/messages/*/ListenStory.json`, `src/messages/*/PublicStoryPage.json`, `src/messages/*/Errors.json`, and `src/messages/*/Voices.json`.
