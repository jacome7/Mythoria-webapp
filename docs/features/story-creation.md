# Story Creation

## Overview

The Story Creation flow is a guided, five-step wizard that takes an authenticated author from initial author details to AI-powered story generation. It supports optional multimodal input (text, images analysed on upload, audio), character management, narrative styling (including narrator personas), and a credit-gated generation step that triggers the backend workflow. The flow is accessed under `/tell-your-story` and is localized via `next-intl` message bundles.

This document explains:

- **End-user experience**: what the author sees and does in each step.
- **Developer implementation**: how the UI, APIs, session storage, and generation workflow are wired together.

---

## End-User Experience (Author Perspective)

### Entry Point & Authentication

- Navigating to `/tell-your-story` redirects signed-in users to Step 1.
- Signed-out visitors see a call-to-action to sign in or create an account.

### Step 1 — Author & Dedication

**Goal:** Define author credit and an optional dedication.

**What users do:**

- Enter the author name(s) to appear on the book.
- Optionally add a dedication message for the opening pages.

**Behavior:**

- The author name defaults to the current profile display name.
- The step validates that an author name is provided before continuing.

### Step 2 — Story Input (Text, Image, Audio)

**Goal:** Provide the story seed that AI can structure, or skip to manual configuration.

**What users do:**

- Pick one or more input options:
  - **Write:** Enter story text in a dedicated modal with writing tips.
  - **Image:** Upload or capture up to 3 images.
  - **Audio:** Upload or record a voice note.
- Optionally select existing characters to include in the story.

**Behavior:**

- Inputs are optional. You can continue without providing anything.
- **Each image is uploaded and analysed immediately on add** (not on “Next”). A per-image status is shown: _Uploading → Analyzing → Ready_ (or _Failed_).
  - Analysis (via Gen AI) extracts the image **type** (photo / drawing / text), a detailed **description**, full **OCR text**, and any **detected people/animals** (with bounding boxes used later to crop character photos).
  - A **“View details”** button opens a modal summarising the extracted metadata.
  - On failure or timeout, a **Retry** button re-runs analysis (up to **2** extra attempts); after that the image is marked unanalysable.
  - **“Next” is blocked** until every image has finished (Ready or terminally Failed).
- **Audio** is also uploaded immediately (it is not pre-analysed; it is transcribed later during structuring).
- The story text is auto-saved in-session; uploaded inputs are tracked by their GCS object path + status (so a reload keeps analysed images).

### Step 3 — Characters

**Goal:** Manage characters for the story.

**What users do:**

- View characters already associated with the story.
- Create new characters with detailed attributes.
- Edit existing characters (name, type, role, traits, etc.).
- Remove a character from the story (does not delete the character itself).
- Add characters from the existing personal library.

**Behavior:**

- If no characters exist yet, the UI prompts the author to add one.
- The step can be entered in **edit mode** to update a draft story.

### Step 4 — Story Settings & Outline

**Goal:** Finalize story metadata and creative direction before generation.

**Required fields:**

- **Title**
- **Target Audience**
- **Novel Style**
- **Graphical Style**

**Optional fields:**

- Story setting/place
- Story outline / plot description
- Additional requests (special details or constraints)
- Image generation instructions
- Story language
- Chapter count (auto-calculated from audience, but can be overridden)
- Narrator persona (literary voice)

**Behavior:**

- Two collapsible sections group style & setting and content details.
- Graphical style selection uses a visual gallery modal.
- Literary persona selection uses a modal with metadata badges and example samples.

### Step 5 — Generate

**Goal:** Trigger the story generation workflow.

**What users see:**

- Pricing and current credit balance for eBook generation.
- A button to start generation (disabled if credits are insufficient).

**Behavior:**

- Credits are deducted before generation begins.
- Generation progress is shown inline, with a progress bar, “factory” messages, and a status label.
- Once generation completes, the user can read the story or return to “My Stories.”

### Draft Editing (Edit Mode)

A draft can be revisited by appending `?edit={storyId}` to steps 3–5. When in edit mode:

- The step loads data directly from the saved story.
- Navigation respects the edit state and returns to the draft workflow.

---

## Developer Implementation (Engineering Perspective)

### High-Level Flow

1. **Step 1** stores author/dedication data locally.
2. **Step 2** uploads + analyses each image immediately (author-scoped staging GCS), uploads audio, creates a temporary story, then kicks off **async** AI structuring and polls it to completion. The structure job relocates the inputs into `{storyId}/inputs/` and writes a replay manifest.
3. **Step 3** manages story-character relationships and can promote a temporary story to draft.
4. **Step 4** persists story metadata and outline fields.
5. **Step 5** deducts credits, marks the story “writing,” and publishes a Pub/Sub request to trigger the workflow.
6. **Progress UI** polls story status until it becomes `published`.

### Key UI Routes & Components

- **Entry redirect:** `src/app/[locale]/tell-your-story/page.tsx`
- **Step 1:** `src/app/[locale]/tell-your-story/step-1/page.tsx`
- **Step 2:** `src/app/[locale]/tell-your-story/step-2/page.tsx`
  - `MediaCapture.tsx` (image/audio capture)
  - `CharacterSelection.tsx` (preselect characters)
  - `WritingTips.tsx` (rotating tips)
- **Step 3:** `src/app/[locale]/tell-your-story/step-3/page.tsx`
  - `CharacterCard` UI component for edit/create
- **Step 4:** `src/app/[locale]/tell-your-story/step-4/page.tsx`
- **Step 5:** `src/app/[locale]/tell-your-story/step-5/page.tsx`
- **Progress UI:** `src/components/StoryGenerationProgress.tsx`
- **Navigation & progress UI:** `src/components/StepNavigation.tsx`, `src/components/ProgressIndicator.tsx`

### Session & Draft State

| Data                                                                               | Storage          | Key              | Used in                       |
| ---------------------------------------------------------------------------------- | ---------------- | ---------------- | ----------------------------- |
| Current story ID                                                                   | `localStorage`   | `currentStoryId` | Steps 2–5 (via session guard) |
| Step 1 data                                                                        | `localStorage`   | `step1Data`      | Steps 1 & 5                   |
| Step 2 inputs (text + image/audio descriptors: `objectPath`, `status`, `metadata`) | `sessionStorage` | `step2Data`      | Step 2 only                   |
| Step 3 data                                                                        | `localStorage`   | `step3Data`      | Step 3 (local cache)          |
| GenAI results                                                                      | `localStorage`   | `genaiResults`   | Step 2 → Step 3/4 prefill     |
| Edit mode flag                                                                     | `localStorage`   | `isEditMode`     | Steps 3–5                     |

Guarding logic:

- `useStorySessionGuard` redirects to Step 1 if `currentStoryId` is missing.

### API Endpoints & Responsibilities

#### Story Creation & Update

| Endpoint                    | Method | Purpose                                                   |
| --------------------------- | ------ | --------------------------------------------------------- |
| `/api/stories`              | POST   | Create a new story (defaults to `temporary`).             |
| `/api/my-stories/{storyId}` | GET    | Fetch story details for steps 4–5 and generation polling. |
| `/api/my-stories/{storyId}` | PUT    | Persist story metadata from step 4.                       |
| `/api/stories/complete`     | POST   | Mark as `writing` and publish a workflow request.         |

#### AI Structuring & Media

| Endpoint                       | Method | Purpose                                                                                                                                         |
| ------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/media/input-upload`      | POST   | Upload an input image/audio to GCS under `{authorId}/inputs` (proxies SGW `/ai/media/upload`). Images normalised to JPEG ≤2048px, q95.          |
| `/api/media/analyze-image`     | POST   | Analyse an uploaded image (type / description / OCR / detected characters); persists a sibling `.json` (proxies SGW `/ai/media/analyze-image`). |
| `/api/media/signed-upload`     | POST   | Back-compat author-scoped upload shim (prefer `input-upload`).                                                                                  |
| `/api/stories/genai-structure` | POST   | Start **async** structuring; proxies SGW `POST /api/jobs/story-structure` and returns `{ jobId, estimatedDuration }`.                           |
| `/api/jobs/:jobId`             | GET    | Poll an async SGW job (structuring, text/image edits) for status + result.                                                                      |

#### Characters

| Endpoint                                          | Method   | Purpose                                      |
| ------------------------------------------------- | -------- | -------------------------------------------- |
| `/api/characters`                                 | GET/POST | List or create user characters.              |
| `/api/characters/{id}`                            | PATCH    | Update a character.                          |
| `/api/stories/{storyId}/characters`               | GET/POST | List or link characters to a story.          |
| `/api/stories/{storyId}/characters/{characterId}` | DELETE   | Remove character from a story.               |
| `/api/stories/{storyId}/available-characters`     | GET      | List characters not yet linked to the story. |

#### Credits & Pricing

| Endpoint                | Method | Purpose                                        |
| ----------------------- | ------ | ---------------------------------------------- |
| `/api/pricing/services` | GET    | Fetch service pricing (eBook generation).      |
| `/api/my-credits`       | GET    | Fetch current credit balance.                  |
| `/api/stories/complete` | POST   | Atomically debit credits and queue generation. |

### AI Structuring & Generation Workflow

- **Image analysis (Step 2, on add):**
  - Each image is uploaded via `/api/media/input-upload` → SGW `/ai/media/upload`, staged at `{authorId}/inputs/{uuid}.jpg` (normalised JPEG ≤2048px, q95) until a story exists.
  - Then `/api/media/analyze-image` → SGW `/ai/media/analyze-image` runs Gen AI (provider from `IMAGE_ANALYZER_PROVIDER` → `IMAGE_PROVIDER`) and writes a sibling `{uuid}.json` with `{ overallImageContent, description, text, characters[] }` (characters include a `box_2d`).
  - The UI tracks per-image status and allows up to 2 analysis retries; **Next** is gated until all images settle.

- **Structuring (Step 2 → async):**
  - `/api/stories/genai-structure` proxies to SGW `POST /api/jobs/story-structure` with the analysed `imageObjectPaths`, the `audioObjectPath`, text, characterIds and locale — **image bytes are never re-sent**, only object paths.
  - SGW first **relocates** the staged inputs (image + `.json` + audio) into `{storyId}/inputs/`, then resolves each image’s metadata (reusing the `.json`, analysing on demand), passes audio + metadata text to the model, persists story fields, creates/links characters, **crops a character photo** from the source image for any photo-derived character, records cover-relevant photo URIs on the story, and writes `description.txt` + `manifest.json` for replay.
  - The client polls `/api/jobs/:jobId`; on completion it stores `job.result` as `genaiResults` in `localStorage` to pre-fill later steps.
  - The story is promoted `temporary → draft` when structuring is kicked off.

- **Generation (Step 5):**
  - `/api/stories/complete` updates the story status to `writing` and publishes a Pub/Sub message (`mythoria-story-requests` by default).
  - The workflow service writes progress updates back to the story record (`storyGenerationCompletedPercentage`, `storyGenerationStatus`, `currentStep`).
  - `StoryGenerationProgress` polls `/api/my-stories/{storyId}` every 15s and redirects when status becomes `published`.

### Data Model Highlights

- **Stories** live in `src/db/schema/stories.ts` and include:
  - Core metadata (title, plot, audience, styles, language)
  - Generation tracking fields (`storyGenerationStatus`, `storyGenerationCompletedPercentage`)
  - `coverReferenceUris` (`jsonb`) — GCS URIs of user input photos flagged relevant for cover generation
  - Status (`temporary`, `draft`, `writing`, `published`)
- **Characters** and the **story_characters** junction table live in `src/db/schema/characters.ts`. Character `photoUrl` / `photoGcsUri` store the current bucket-relative character photo path, including **cropped photos** extracted from input images during structuring.

### GCS Layout

| Path                                                | Contents                                                                                                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{authorId}/inputs/{uuid}.jpg` (+ `.json`, audio)   | **Staging** only — Step 2 uploads land here before a story exists                                                                                                       |
| `{storyId}/inputs/{uuid}.jpg`                       | Normalised input photo (JPEG ≤2048px, q95), relocated on structure                                                                                                      |
| `{storyId}/inputs/{uuid}.json`                      | Extracted image metadata (sibling of the photo)                                                                                                                         |
| `{storyId}/inputs/{uuid}.{ext}`                     | Uploaded input audio                                                                                                                                                    |
| `{storyId}/inputs/description.txt`                  | The user's free-text input                                                                                                                                              |
| `{storyId}/inputs/manifest.json`                    | Replay manifest: text, image paths + metadata, audio, locale, characterIds                                                                                              |
| `{authorId}/characters/{characterId}/{version}.jpg` | Character photo (manual uploads and crops from input photos)                                                                                                            |
| `{storyId}/images/...`                              | Generated cover/chapter images                                                                                                                                          |
| `{storyId}/prompts/...`                             | **Debug only** — rendered generation prompts (outline, chapters, images) + variable sidecars. Written by SGW only when `DEBUG_PERSIST_PROMPTS=true`; off in production. |

> **Input lifecycle (staging → story-scoped):** photos/audio are uploaded in Step 2 **before** a story row exists, so they first land under `{authorId}/inputs/` as a staging area. When the user clicks Next and the async structure job runs, it **relocates** (moves) the image + its `.json` metadata + audio into the new `{storyId}/inputs/` folder, then writes `description.txt` and a `manifest.json`. The result is a self-contained per-story input snapshot that a future "re-generate outline" feature can replay. `stories.coverReferenceUris` and character crop sources reference the story-scoped paths.
>
> **Returning to Step 2:** because the move deletes the staging copies, the client records the relocation (`localStorage.step2RelocatedInputs = { storyId, paths, audioPath }`) when the job starts. On re-entry, `useStep2Session` re-points any restored input whose path was relocated to its new `{storyId}/inputs/` location, so the gallery stays valid. If such an input is re-submitted (creating a new story), the structure job **copies** it (rather than moving) so the earlier story keeps its snapshot.

### End-to-End Pipeline

```
Step 1 (author) → Step 2 (text + per-image upload&analyse + audio upload)
   → create story → POST /api/stories/genai-structure → SGW job:
        analyse-if-needed → structure (story + characters) → crop character photos → flag cover refs
   → poll /api/jobs/:jobId → genaiResults
Step 3 (characters) → Step 4 (settings) → Step 5 (generate)
   → SGW workflow: outline → chapters → images (cover uses flagged input photos + character crops) → assemble → print
```

### Enumerations & Options

- `TargetAudience`, `NovelStyle`, `GraphicalStyle`, and `LiteraryPersona` enums live in `src/types/story-enums.ts`.
- Graphical styles include `euro_comic_book` (labeled “Humorous Adventure”).
- Literary personas provide metadata that powers the narrator persona picker.

### Analytics Hooks

Story creation events are tracked through `trackStoryCreation` in `src/lib/analytics.ts`:

- `story_creation_started`
- `story_creation_step_completed` (with `step`)
- `story_generation_requested`

### Localization

- All copy for the five steps is in `src/messages/{locale}/StorySteps.json`.
- The generation progress UI uses `src/messages/{locale}/StoryGenerationProgress.json`.
- The wizard is locale-prefixed (`/[locale]/tell-your-story/...`).

### Known Implementation Notes

- The step count used by `ProgressIndicator` and `StepNavigation` is inconsistent in Step 2 (total steps are set to 6 or 7) while other steps use 5. Align these values if you want a consistent UI experience.

---

## Troubleshooting & Extension Tips

- **Add new story fields:** extend `src/types/story.ts`, update the story schema, and wire new fields into Step 4’s `PUT /api/my-stories/{storyId}` request.
- **Add new styles/personas:** update `src/types/story-enums.ts` and ensure localized labels are present.
- **Modify AI inputs:** image analysis lives in SGW `src/services/image-analysis.ts` + `src/prompts/image-analysis.json` (schema `src/prompts/schemas/image-metadata.json`); structuring in SGW `src/services/story-structure.ts` + `src/prompts/en-US/text-structure.json`. The webapp starts the async job via `/api/stories/genai-structure` and polls `/api/jobs/:jobId`.
- **Change credits logic:** update the central story-generation service and its pricing pipeline; clients must never debit credits separately.

---

## Related Documentation

- [Story Characters](story-characters.md)
- [Edit Story](edit-story.md)
- [Credits & Payments](credits-payments.md)
- [Audiobook Forge](audiobook.md)
