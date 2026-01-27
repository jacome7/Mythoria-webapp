# Story Creation

## Overview

The Story Creation flow is a guided, five-step wizard that takes an authenticated author from initial author details to AI-powered story generation. It supports optional multimodal input (text, images, audio), character management, narrative styling (including narrator personas), and a credit-gated generation step that triggers the backend workflow. The flow is accessed under `/tell-your-story` and is localized via `next-intl` message bundles.

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
- The UI shows “Added” badges once input is supplied.
- The story text is auto-saved in-session; image/audio previews are cached locally.

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
2. **Step 2** creates a temporary story record, optionally uploads media to SGW, then optionally triggers AI structuring.
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

| Data             | Storage          | Key              | Used in                       |
| ---------------- | ---------------- | ---------------- | ----------------------------- |
| Current story ID | `localStorage`   | `currentStoryId` | Steps 2–5 (via session guard) |
| Step 1 data      | `localStorage`   | `step1Data`      | Steps 1 & 5                   |
| Step 2 inputs    | `sessionStorage` | `step2Data`      | Step 2 only                   |
| Step 3 data      | `localStorage`   | `step3Data`      | Step 3 (local cache)          |
| GenAI results    | `localStorage`   | `genaiResults`   | Step 2 → Step 3/4 prefill     |
| Edit mode flag   | `localStorage`   | `isEditMode`     | Steps 3–5                     |

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

| Endpoint                       | Method | Purpose                                                               |
| ------------------------------ | ------ | --------------------------------------------------------------------- |
| `/api/media/signed-upload`     | POST   | Proxy media uploads to SGW for image/audio inputs.                    |
| `/api/stories/genai-structure` | POST   | Forward text/image/audio input to SGW’s `ai/text/structure` endpoint. |

#### Characters

| Endpoint                                          | Method   | Purpose                                      |
| ------------------------------------------------- | -------- | -------------------------------------------- |
| `/api/characters`                                 | GET/POST | List or create user characters.              |
| `/api/characters/{id}`                            | PATCH    | Update a character.                          |
| `/api/stories/{storyId}/characters`               | GET/POST | List or link characters to a story.          |
| `/api/stories/{storyId}/characters/{characterId}` | DELETE   | Remove character from a story.               |
| `/api/stories/{storyId}/available-characters`     | GET      | List characters not yet linked to the story. |

#### Credits & Pricing

| Endpoint                                | Method | Purpose                                   |
| --------------------------------------- | ------ | ----------------------------------------- |
| `/api/pricing/services`                 | GET    | Fetch service pricing (eBook generation). |
| `/api/my-credits`                       | GET    | Fetch current credit balance.             |
| `/api/stories/{storyId}/deduct-credits` | POST   | Deduct credits before generation.         |

### AI Structuring & Generation Workflow

- **Structuring (Step 2):**
  - Media inputs are uploaded through `/api/media/signed-upload`, which proxies to SGW’s `/ai/media/upload` endpoint.
  - The structured response is requested via `/api/stories/genai-structure`.
  - Results are stored in `localStorage` as `genaiResults` and are expected to pre-fill later steps.
  - If the story is still `temporary`, successful structuring promotes it to `draft`.

- **Generation (Step 5):**
  - `/api/stories/complete` updates the story status to `writing` and publishes a Pub/Sub message (`mythoria-story-requests` by default).
  - The workflow service writes progress updates back to the story record (`storyGenerationCompletedPercentage`, `storyGenerationStatus`, `currentStep`).
  - `StoryGenerationProgress` polls `/api/my-stories/{storyId}` every 15s and redirects when status becomes `published`.

### Data Model Highlights

- **Stories** live in `src/db/schema/stories.ts` and include:
  - Core metadata (title, plot, audience, styles, language)
  - Generation tracking fields (`storyGenerationStatus`, `storyGenerationCompletedPercentage`)
  - Status (`temporary`, `draft`, `writing`, `published`)
- **Characters** and the **story_characters** junction table live in `src/db/schema/characters.ts`.

### Enumerations & Options

- `TargetAudience`, `NovelStyle`, `GraphicalStyle`, and `LiteraryPersona` enums live in `src/types/story-enums.ts`.
- Graphical styles include `euro_comic_book` (labeled “Humorous Adventure”).
- Literary personas provide metadata that powers the narrator persona picker.

### Analytics Hooks

Story creation events are tracked through `trackStoryCreation` in `src/lib/analytics.ts`:

- `story_creation_started`
- `story_step{1-4}_completed`
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
- **Modify AI inputs:** update Step 2 payload and SGW handling in `/api/stories/genai-structure`.
- **Change credits logic:** update `/api/stories/{storyId}/deduct-credits` and the pricing service pipeline.

---

## Related Documentation

- [Story Characters](story-characters.md)
- [Edit Story](edit-story.md)
- [Credits & Payments](credits-payments.md)
- [Audiobook Forge](audiobook.md)
