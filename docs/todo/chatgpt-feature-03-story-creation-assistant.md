# Feature 03 - Story Creation Assistant

Status: In progress (core MCP backend implemented)

## Description

This feature enables end-to-end story creation directly in ChatGPT using Mythoria creation capabilities.

It maps the web 5-step creation flow into conversational MCP tools with explicit readiness checks and confirmation before generation spend.

## Workflow

1. User asks to create a story.
2. Assistant calls `mythoria.story.create_draft`.
3. Assistant collects missing required fields:

- title
- target audience
- novel style
- graphical style

4. Assistant optionally enriches the draft with:

- setting and outline
- additional instructions
- characters (existing or new)

5. Assistant validates readiness and credit estimate with `mythoria.story.start_generation` (`dryRun` or without `confirmStart`).
6. Assistant asks for explicit confirmation.
7. Assistant calls `mythoria.story.start_generation` with `confirmStart=true` to deduct credits and queue generation.

## Communication examples

1. User: "Create a story about a shy fox learning courage."

- Assistant: creates draft, asks missing audience/style fields.

2. User: "Write in Portuguese for ages 7-10, watercolor style."

- Assistant: updates draft, confirms it is ready.

3. User: "Use these two characters: Mia and Joao, siblings."

- Assistant: adds characters to the draft before generation.

4. User: "Start now."

- Assistant: runs confirmed generation call and returns queued status + run id.

## Dependencies

- Existing story data services in `src/db/services.ts`:
- `storyService.createStory`
- `storyService.updateStory`
- `storyService.getStoryById`
- `characterService.*`
- `storyCharacterService.*`
- Existing pricing and credit services:
- `pricingService.calculateCreditsForFeatures`
- `creditService.getAuthorCreditBalance`
- `creditService.deductCredits`
- Existing workflow publisher:
- `publishStoryRequest` from `src/lib/pubsub.ts`
- Feature 02 OAuth-based authentication and scope enforcement.
- Feature 10 for future unified job tracking.

## Implemented

### Tools

Implemented in `src/lib/mcp/server.ts`:

- `mythoria.story.create_draft`
- `mythoria.story.update_draft`
- `mythoria.story.add_characters`
- `mythoria.story.start_generation`

### Auth and scopes

- Added `mythoria.story.write` scope in `src/lib/mcp/auth.ts`.
- All Feature 03 tools require OAuth with `mythoria.story.write`.
- `tools/list` exposes `securitySchemes` for these tools.

### Guardrails and structured responses

- Draft state now includes:
- `readyToGenerate`
- `missingRequiredFields`
- localized missing-field labels
- prompt hints per missing field
- Start-generation tool supports:
- readiness/credit preview mode (`dryRun` or missing `confirmStart`)
- explicit confirmation flow (`confirmStart=true`) before deductions
- queued response with `runId` when started
- Tool responses return concise text + `structuredContent` + `_meta` state snapshots.

### Character flow

- Supports linking existing user characters.
- Supports creating new characters and linking them in one call.
- Handles duplicate character-link attempts gracefully.

### Validation

- Added/updated MCP unit tests in `src/lib/mcp/server.test.ts`:
- draft creation
- draft update readiness
- character add flow
- confirmed generation queue flow
- securitySchemes scope exposure for story-write tools

## Still missing / follow-up

1. GenAI structuring bridge in MCP creation flow:

- Current tools focus on explicit draft fields + character enrichment.
- Step-2-like multimodal structuring (`/api/stories/genai-structure`) is not yet wrapped as MCP creation tools.

2. Unified status tracking adoption:

- Generation responses now include a trackable Mythoria `jobId`.
- Follow-up status should use `mythoria.jobs.status` (Feature 10).

3. ChatGPT embedded UI for creation forms:

- Core creation widget resources are now implemented in Feature 11.
- Advanced form UX (richer controls and deeper validation hints) remains a follow-up.
