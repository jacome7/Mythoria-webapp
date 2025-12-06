# Story Creation Flow Documentation

This document provides a comprehensive overview of the story creation process in Mythoria, from the initial user interaction to story generation.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Step-by-Step Flow](#step-by-step-flow)
   - [Step 1: Author Profile](#step-1-author-profile)
   - [Step 2: Story Input](#step-2-story-input)
   - [Step 3: Characters](#step-3-characters)
   - [Step 4: Story Settings](#step-4-story-settings)
   - [Step 5: Generation](#step-5-generation)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [AI Processing](#ai-processing)
7. [Session Management](#session-management)
8. [Edit Mode (Draft Editing)](#edit-mode-draft-editing)
9. [Story Status Lifecycle](#story-status-lifecycle)

---

## Overview

The story creation process in Mythoria is a multi-step wizard that guides users through creating personalized stories. The process is divided into 5 steps:

1. **Author Profile** - Define author name and optional dedication message
2. **Story Input** - Provide story inspiration through text, images, or audio
3. **Characters** - Define and manage characters for the story
4. **Story Settings** - Configure story attributes (title, audience, style, etc.)
5. **Generation** - Review and trigger story generation

The flow supports both **new story creation** and **editing existing drafts** before generation.

---

## Architecture

### Key Components

| Component         | Location                                       | Purpose                                        |
| ----------------- | ---------------------------------------------- | ---------------------------------------------- |
| Step Pages        | `src/app/[locale]/tell-your-story/step-{1-5}/` | UI pages for each step                         |
| Story Session     | `src/lib/story-session.ts`                     | Client-side session storage utilities          |
| API Routes        | `src/app/api/stories/`                         | Backend endpoints for story operations         |
| Database Services | `src/db/services.ts`                           | Database operations for stories and characters |
| SGW Integration   | `src/lib/sgw-client.ts`                        | Story Generation Workflow service client       |

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web App UI    │────▶│   API Routes    │────▶│    Database     │
│   (Next.js)     │     │   (Next.js)     │     │   (PostgreSQL)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        │               │      SGW        │
        │               │ (AI Processing) │
        │               └─────────────────┘
        │                       │
        └───────────────────────┘
              (GenAI results stored in localStorage)
```

---

## Step-by-Step Flow

### Step 1: Author Profile

**Path:** `src/app/[locale]/tell-your-story/step-1/page.tsx`

**Purpose:** Capture author identification and optional dedication message.

#### User Inputs

| Field              | Required | Description                                                               |
| ------------------ | -------- | ------------------------------------------------------------------------- |
| Author Name        | Yes      | Custom name to appear on the book cover (defaults to user's display name) |
| Dedication Message | No       | Optional personalized dedication message for the book                     |

#### Technical Details

- Fetches current user data from `/api/auth/me`
- Loads existing step data from `localStorage` via `getStep1Data()`
- Saves data to `localStorage` via `setStep1Data()` on navigation
- Tracks analytics via `trackStoryCreation.step1Completed()`

#### Session Storage

```typescript
interface Step1Data {
  customAuthor: string;
  dedicationMessage: string;
}
```

---

### Step 2: Story Input

**Path:** `src/app/[locale]/tell-your-story/step-2/page.tsx`

**Purpose:** Allow users to provide story inspiration through multiple input methods.

#### User Inputs

All inputs are **optional**. Users can proceed without providing any input, but they will need to manually configure all story details in subsequent steps.

| Input Type          | Component                | Description                               |
| ------------------- | ------------------------ | ----------------------------------------- |
| Text                | Text Modal               | Free-form story description or idea       |
| Images              | `MediaCapture.tsx`       | Upload or capture photos (max 3)          |
| Audio               | `MediaCapture.tsx`       | Upload or record audio narration          |
| Existing Characters | `CharacterSelection.tsx` | Select pre-existing characters to include |

#### GenAI Processing

When the user provides any content (text, image, or audio), the system processes it with AI to extract story structure:

1. **Story Creation:** A new story record is created in the database with `status: 'temporary'`
2. **Media Upload:** Images/audio are uploaded to Google Cloud Storage via `/api/media/signed-upload`
3. **AI Structuring:** Content is sent to SGW's `/ai/text/structure` endpoint
4. **Auto-Population:** AI suggests values for:
   - Story title
   - Plot description
   - Synopsis
   - Place/setting
   - Target audience
   - Novel style
   - Graphical style
   - Story language
   - Characters (created and linked to story)

**Note:** All AI-suggested values can be modified by the user in Step 4.

#### Character Pre-Selection

Users can select existing characters from their character library. These characters:

- Are passed to the GenAI for context during story structuring
- Are automatically linked to the story via the `story_characters` junction table
- Appear in Step 3 for further editing if needed

#### Session Storage

```typescript
interface SessionData {
  text: string;
  images: string[]; // Base64 previews
  audio: string | null;
  lastSaved: number;
}
```

Stored in `sessionStorage` under key `step2Data`.

---

### Step 3: Characters

**Path:** `src/app/[locale]/tell-your-story/step-3/page.tsx`

**Purpose:** Manage characters for the story.

#### Features

| Feature         | Description                                                             |
| --------------- | ----------------------------------------------------------------------- |
| View Characters | Display characters linked to the story (from GenAI or manual selection) |
| Create New      | Create new characters with full attribute definition                    |
| Edit Existing   | Modify character attributes (name, type, role, traits, etc.)            |
| Delete/Remove   | Remove characters from the story                                        |
| Add Existing    | Add characters from the user's character library                        |

#### Character Attributes

| Attribute             | Type     | Description                                            |
| --------------------- | -------- | ------------------------------------------------------ |
| `name`                | Required | Character name                                         |
| `type`                | Optional | Character type (boy, girl, dog, dragon, etc.)          |
| `role`                | Optional | Story role (protagonist, antagonist, supporting, etc.) |
| `age`                 | Optional | Age category (infant, toddler, teenage, adult, etc.)   |
| `traits`              | Optional | Personality traits (max 5)                             |
| `characteristics`     | Optional | Behavioral characteristics/quirks                      |
| `physicalDescription` | Optional | Physical appearance description                        |
| `photoUrl`            | Optional | Character photo URL                                    |

#### Character Types

Characters are categorized into:

- **Human:** boy, girl, man, woman, person
- **Animal:** dog, cat, bird, other_animal
- **Fantasy:** dragon, elf_fairy_mythical, robot_cyborg, alien_extraterrestrial, other_creature
- **Other:** other

#### Character Roles

- protagonist, antagonist, supporting, mentor, comic_relief, love_interest, sidekick, narrator, other

---

### Step 4: Story Settings

**Path:** `src/app/[locale]/tell-your-story/step-4/page.tsx`

**Purpose:** Configure all story attributes before generation.

#### Story Basics (Always Visible)

| Field           | Required | Description                                            |
| --------------- | -------- | ------------------------------------------------------ |
| Title           | Yes      | Story title                                            |
| Target Audience | Yes      | Age group for the story                                |
| Book Size       | No       | Number of chapters (auto-calculated based on audience) |
| Story Language  | No       | Language for story content (defaults to user's locale) |

#### Style & Setting (Collapsible Section)

| Field                         | Required | Description                                 |
| ----------------------------- | -------- | ------------------------------------------- |
| Place                         | No       | Story setting/location description          |
| Novel Style                   | Yes      | Genre/literary style                        |
| Graphical Style               | Yes      | Visual illustration style                   |
| Image Generation Instructions | No       | Custom instructions for AI image generation |

#### Content Details (Collapsible Section)

| Field               | Required | Description                                              |
| ------------------- | -------- | -------------------------------------------------------- |
| Plot Description    | No       | Detailed story outline                                   |
| Additional Requests | No       | Special requests (products, companies, specific details) |

#### Target Audience Options

| Value               | Label                         | Default Chapters |
| ------------------- | ----------------------------- | ---------------- |
| `children_0-2`      | Babies & Toddlers (0-2 years) | 2                |
| `children_3-6`      | Preschoolers (3-6 years)      | 4                |
| `children_7-10`     | Early Elementary (7-10 years) | 6                |
| `children_11-14`    | Middle Grade (11-14 years)    | 6                |
| `young_adult_15-17` | Young Adult (15-17 years)     | 8                |
| `adult_18+`         | Adults (18+ years)            | 10               |
| `all_ages`          | All Ages                      | 6                |

#### Novel Style Options

adventure, fantasy, mystery, romance, science_fiction, historical, contemporary, fairy_tale, comedy, drama, horror, thriller, biography, educational, poetry, sports_adventure

#### Graphical Style Options

cartoon, realistic, watercolor, digital_art, hand_drawn, minimalist, vintage, comic_book, anime, pixar_style, disney_style, sketch, oil_painting, colored_pencil

The graphical style selection includes a visual gallery modal showing example images for each style.

---

### Step 5: Generation

**Path:** `src/app/[locale]/tell-your-story/step-5/page.tsx`

**Purpose:** Review story details and initiate generation.

#### Pre-Generation Checks

1. **Story Data Validation:** Ensures all required fields are populated
2. **Credit Check:** Verifies user has sufficient credits for eBook generation
3. **Pricing Display:** Shows the cost and user's current balance

#### Generation Process

1. **Credit Deduction:** Credits are deducted via `/api/stories/{storyId}/deduct-credits`
2. **Story Update:** Story status is set to `'writing'`
3. **Pub/Sub Trigger:** A message is published to Google Cloud Pub/Sub (`mythoria-story-requests` topic)
4. **Progress Tracking:** UI switches to `StoryGenerationProgress` component

#### Progress Component

The `StoryGenerationProgress` component:

- Polls `/api/my-stories/{storyId}` every 15 seconds
- Displays generation progress percentage
- Shows fun, rotating messages during generation
- Redirects to story view when `status` becomes `'published'`

**Note:** Credits are required to generate a story. Credit management (purchasing, balance, etc.) is documented separately.

---

## Database Schema

### Stories Table

**Location:** `src/db/schema/stories.ts`

```typescript
stories = pgTable('stories', {
  storyId: uuid().primaryKey().defaultRandom(),
  authorId: uuid().notNull().references(authors.authorId),
  title: varchar(255).notNull(),
  plotDescription: text(),
  storyLanguage: varchar(5).default('en-US'),
  synopsis: text(),
  place: text(),
  additionalRequests: text(),
  imageGenerationInstructions: text(),
  targetAudience: targetAudienceEnum(),
  novelStyle: novelStyleEnum(),
  graphicalStyle: graphicalStyleEnum(),
  status: storyStatusEnum().default('draft'),
  features: jsonb(), // {"ebook":true,"printed":false,"audiobook":true}
  deliveryAddress: jsonb(),
  customAuthor: text(),
  dedicationMessage: text(),
  chapterCount: integer().default(6),
  storyGenerationStatus: runStatusEnum(),
  storyGenerationCompletedPercentage: integer().default(0),
  // ... additional fields for covers, PDFs, sharing, etc.
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
});
```

### Characters Table

**Location:** `src/db/schema/characters.ts`

```typescript
characters = pgTable('characters', {
  characterId: uuid().primaryKey().defaultRandom(),
  authorId: uuid().references(authors.authorId),
  name: varchar(120).notNull(),
  type: varchar(50),
  role: characterRoleEnum(),
  age: characterAgeEnum(),
  traits: json().$type<string[]>().default([]),
  characteristics: text(),
  physicalDescription: text(),
  photoUrl: text(),
  createdAt: timestamp().defaultNow(),
});
```

### Story-Characters Junction Table

```typescript
storyCharacters = pgTable(
  'story_characters',
  {
    storyId: uuid().notNull().references(stories.storyId),
    characterId: uuid().notNull().references(characters.characterId),
    role: characterRoleEnum(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.storyId, table.characterId] }),
  }),
);
```

---

## API Endpoints

### Story Management

| Endpoint                                | Method | Description                   |
| --------------------------------------- | ------ | ----------------------------- |
| `/api/stories`                          | POST   | Create new story              |
| `/api/stories`                          | GET    | Get published stories         |
| `/api/my-stories/{storyId}`             | GET    | Get user's story details      |
| `/api/my-stories/{storyId}`             | PUT    | Update story attributes       |
| `/api/stories/genai-structure`          | POST   | Process content with AI       |
| `/api/stories/complete`                 | POST   | Trigger story generation      |
| `/api/stories/{storyId}/deduct-credits` | POST   | Deduct credits for generation |

### Character Management

| Endpoint                                          | Method | Description                     |
| ------------------------------------------------- | ------ | ------------------------------- |
| `/api/characters`                                 | GET    | Get user's characters           |
| `/api/characters`                                 | POST   | Create new character            |
| `/api/characters/{characterId}`                   | PATCH  | Update character                |
| `/api/stories/{storyId}/characters`               | GET    | Get story's characters          |
| `/api/stories/{storyId}/characters`               | POST   | Link character to story         |
| `/api/stories/{storyId}/characters/{characterId}` | DELETE | Remove character from story     |
| `/api/stories/{storyId}/available-characters`     | GET    | Get characters not yet in story |

### Media Upload

| Endpoint                   | Method | Description                     |
| -------------------------- | ------ | ------------------------------- |
| `/api/media/signed-upload` | POST   | Get signed URL for media upload |

---

## AI Processing

### Text Structure Endpoint

**SGW Route:** `/ai/text/structure`

**Purpose:** Analyze user-provided content (text, image, audio) and generate structured story data.

#### Request Payload

```typescript
{
  storyId: string;           // UUID of the story
  userDescription?: string;  // User's text description
  imageData?: string;        // Base64 encoded image (legacy)
  audioData?: string;        // Base64 encoded audio (legacy)
  imageObjectPath?: string;  // GCS object path (preferred)
  audioObjectPath?: string;  // GCS object path (preferred)
  characterIds?: string[];   // Existing character IDs to include
}
```

#### Response Structure

```json
{
  "story": {
    "title": "...",
    "plotDescription": "...",
    "synopsis": "...",
    "place": "...",
    "additionalRequests": "...",
    "targetAudience": "children_7-10",
    "novelStyle": "adventure",
    "graphicalStyle": "pixar_style",
    "storyLanguage": "en-US"
  },
  "characters": [
    {
      "characterId": null,
      "name": "...",
      "type": "boy",
      "age": "school_age",
      "traits": ["brave", "curious"],
      "characteristics": "...",
      "physicalDescription": "...",
      "role": "protagonist"
    }
  ]
}
```

#### AI Prompt Reference

The AI structuring uses the prompt template located at:

- **Prompt:** `story-generation-workflow/src/prompts/en-US/text-structure.json`
- **Schema:** `story-generation-workflow/src/prompts/schemas/story-structure.json`

Key prompt guidelines:

- Analyzes user content to detect the primary language
- Generates story content in the detected language
- Follows graphical style recommendations based on story type
- Creates characters with complete attribute definitions
- Returns structured JSON matching the defined schema

### Story Outline Generation

After story generation is triggered in Step 5, the SGW uses the outline prompt to create the full story structure:

**Prompt:** `story-generation-workflow/src/prompts/en-US/text-outline.json`

This prompt:

- Creates chapter-by-chapter breakdown
- Generates illustration prompts for covers and chapters
- Ensures character consistency across all illustrations
- Follows safety guidelines for AI image generation
- Respects target audience appropriateness

---

## Session Management

### Storage Locations

| Data             | Storage        | Key              |
| ---------------- | -------------- | ---------------- |
| Current Story ID | localStorage   | `currentStoryId` |
| Step 1 Data      | localStorage   | `step1Data`      |
| Step 2 Data      | sessionStorage | `step2Data`      |
| Step 3 Data      | localStorage   | `step3Data`      |
| GenAI Results    | localStorage   | `genaiResults`   |
| Edit Mode Flag   | localStorage   | `isEditMode`     |

### Session Guard Hook

**Location:** `src/hooks/useStorySessionGuard.ts`

The `useStorySessionGuard` hook:

- Verifies a valid story session exists
- Redirects to Step 1 if no valid session
- Returns the current story ID

```typescript
const storyId = useStorySessionGuard();
```

### Clearing Session

Call `clearStorySession()` to remove all story-related data from storage:

```typescript
import { clearStorySession } from '@/lib/story-session';

clearStorySession();
// Removes: currentStoryId, step1Data, step2Data, step3Data, isEditMode
```

---

## Edit Mode (Draft Editing)

The story creation flow supports editing existing drafts before they are generated.

### Entering Edit Mode

Navigate to any step with the `edit` query parameter:

```
/tell-your-story/step-3?edit={storyId}
/tell-your-story/step-4?edit={storyId}
/tell-your-story/step-5?edit={storyId}
```

### Edit Mode Behavior

1. **Step 3:** Loads existing characters from the story
2. **Step 4:** Loads all story attributes for modification
3. **Step 5:** Allows re-triggering generation with updated data

### Edit Mode vs Post-Generation Editing

- **Edit Mode (documented here):** Editing a story in `draft` or `temporary` status BEFORE generation
- **Post-Generation Editing:** Mythoria provides more powerful editing tools for stories that have already been generated and published (documented separately)

### Technical Implementation

```typescript
const searchParams = useSearchParams();
const editStoryId = searchParams?.get('edit');

if (editStoryId) {
  setEditMode(true);
  await loadExistingStoryData(editStoryId);
  // ... load story data and characters
}
```

---

## Story Status Lifecycle

Stories progress through the following statuses:

```
temporary → draft → writing → published
```

| Status      | Description                         | Trigger                                   |
| ----------- | ----------------------------------- | ----------------------------------------- |
| `temporary` | Placeholder story created in Step 2 | `POST /api/stories` with no content       |
| `draft`     | Story with meaningful content       | Content added (GenAI results, characters) |
| `writing`   | Story generation in progress        | User triggers generation in Step 5        |
| `published` | Story generation complete           | SGW completes all chapters                |

### Status Transitions

1. **temporary → draft:** Automatic when:
   - GenAI processes content and returns structured data
   - User links characters to the story
2. **draft → writing:** When user clicks "Generate My Story" in Step 5

3. **writing → published:** When SGW completes story generation

### Additional Status Tracking

The `storyGenerationStatus` field tracks the generation workflow:

- `queued`: Request submitted to Pub/Sub
- `running`: SGW actively processing
- `completed`: Generation finished successfully
- `failed`: Generation encountered an error
- `cancelled`: Generation was cancelled

---

## Related Documentation

- [Database Schema](../src/db/AGENTS.md) - Complete database documentation
- [SGW AGENTS.md](../../story-generation-workflow/AGENTS.md) - Story Generation Workflow documentation
- [AI Prompts](../../story-generation-workflow/src/prompts/) - AI prompt templates

---

## File References

### UI Components

| Component                 | Path                                                             |
| ------------------------- | ---------------------------------------------------------------- |
| Step Navigation           | `src/components/StepNavigation.tsx`                              |
| Progress Indicator        | `src/components/ProgressIndicator.tsx`                           |
| Character Card            | `src/components/CharacterCard.tsx`                               |
| Media Capture             | `src/app/[locale]/tell-your-story/step-2/MediaCapture.tsx`       |
| Character Selection       | `src/app/[locale]/tell-your-story/step-2/CharacterSelection.tsx` |
| Writing Tips              | `src/app/[locale]/tell-your-story/step-2/WritingTips.tsx`        |
| Story Generation Progress | `src/components/StoryGenerationProgress.tsx`                     |

### Hooks

| Hook                 | Path                                | Purpose                   |
| -------------------- | ----------------------------------- | ------------------------- |
| useStep2Session      | `src/hooks/useStep2Session.ts`      | Step 2 session management |
| useStorySessionGuard | `src/hooks/useStorySessionGuard.ts` | Session validation        |
| useMediaUpload       | `src/hooks/useMediaUpload.ts`       | Media upload utilities    |

### Types

| Type File       | Path                           |
| --------------- | ------------------------------ |
| Story Types     | `src/types/story.ts`           |
| Story Enums     | `src/types/story-enums.ts`     |
| Character Enums | `src/types/character-enums.ts` |
