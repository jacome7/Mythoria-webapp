# Feature 01 - Discovery and App Positioning

Status date: 2026-02-10

## Description

This feature makes Mythoria discoverable when users ask ChatGPT for story-writing help, and provides low-friction first value through noauth discovery tools.

## Implemented

### 1. New MCP taxonomy (breaking rename, no backward compatibility)

Implemented in `src/lib/mcp/server.ts`:

- `mythoria.discovery.ping`
- `mythoria.discovery.capabilities`
- `mythoria.discovery.featured_stories`
- `mythoria.discovery.sample_story_preview`
- `mythoria.help.browse`
- `mythoria.help.search`
- `mythoria.catalog.credit_packages`
- `mythoria.account.story_list`
- `mythoria.account.credit_usage`
- `mythoria.account.payment_history`
- `mythoria.story.export_request`
- `mythoria.story.print_request`
- `mythoria.story.narration_request`

### 2. Discovery-oriented public tools

Implemented in `src/lib/mcp/server.ts`:

- `mythoria.discovery.capabilities`: positioning + workflows + prompt suggestions.
- `mythoria.discovery.featured_stories`: curated public stories for quality preview.
- `mythoria.discovery.sample_story_preview`: noauth curated sample preview with excerpt, image, and links.

### 3. Localized discovery responses (day-one baseline)

Implemented locale-aware copy in `src/lib/mcp/server.ts` using supported locales:

- `en-US`, `pt-PT`, `es-ES`, `fr-FR`, `de-DE`.

### 4. App-log telemetry (no DB changes)

Implemented structured log events in `src/lib/mcp/server.ts`:

- Event types: `start`, `success`, `error`
- Fields: `toolName`, `authState`, `locale`, `latencyMs`, `error`
- Prefix: `[mcp-tool]`

### 5. Validation updates

Implemented tests:

- `src/lib/mcp/server.test.ts` updated for new taxonomy.
- Added discovery/sample preview coverage.
- `tests/playwright/mcp.spec.ts` updated for renamed tools.

### 6. MCP docs update

Updated:

- `docs/mcp.md` with new taxonomy and noauth sample preview flow.

## Missing / Deferred

### 1. Automated discovery benchmark harness

Manual evaluation only for now. See `docs/todo/chatgpt-discovery-manual-eval.md`.

### 2. ChatGPT listing assets upload

Screenshot capture and listing copy are specified below, but final upload/submission is still pending.

## Workflow (current)

1. User asks for a story-writing task.
2. ChatGPT can call:

- `mythoria.discovery.capabilities`
- `mythoria.discovery.sample_story_preview`
- `mythoria.discovery.featured_stories`

3. If user wants account-specific operations, assistant transitions to authenticated tools.

## Communication examples

1. User: "Write me a fantasy story about two sisters and a dragon."

- Suggested first call: `mythoria.discovery.sample_story_preview`
- Follow-up: offer Mythoria creation flow.

2. User: "I need a bedtime story for a 6-year-old."

- Suggested first call: `mythoria.discovery.capabilities`
- Then continue with creation flow prompts.

3. User: "What is the weather in Lisbon?"

- Expected behavior: Mythoria app should not be selected.

## Dependencies

- Existing featured/public story data (`storyService.getFeaturedPublicStories`).
- Public story APIs (`/api/p/[slug]` and chapter/audio endpoints).
- Supported locales config (`src/config/locales.ts`).

## Screenshot recommendations

1. Discovery trigger:

- Chat with a direct story intent and Mythoria app recommendation visible.

2. Sample preview:

- Response from `mythoria.discovery.sample_story_preview` showing image, excerpt, and read link.

3. Featured browsing:

- Response from `mythoria.discovery.featured_stories` with 3-6 story cards/entries.

4. Guidance/FAQ:

- `mythoria.help.search` answering "How can I write better stories for kids?".

5. Negative intent check (internal QA):

- Non-story prompt where Mythoria is not selected.

## Copy templates

### App short description template

- "Create personalized stories with images and audio in minutes."

### Discovery handoff template

- "I can use Mythoria to create a custom story with illustrations and optional audio. Want a quick sample first?"

### Sample preview template

- "Here is a curated Mythoria sample. If you like this style, I can start one tailored to your prompt."

### Clarification template

- "Should this story be for bedtime, learning, or pure adventure?"

## Acceptance targets

1. Discovery precision on negative prompts: >= 90%
2. Recall on direct story prompts: >= 75%
3. Noauth sample preview available with low-latency curated mode.
