# Feature 05 - Story Reading Experience

Status: In progress (core MCP backend implemented)

## Description

This feature enables direct story reading in ChatGPT with chapter-aware navigation.

Primary goals:

- Load story reading overview with chapter index.
- Read chapter content in `full`, `summary`, or `excerpt` mode.
- Continue navigation with `next`/`previous` without leaving chat.
- Support public and private reading paths in one toolset.

## Workflow

1. User picks a story (typically from Feature 04 selection).
2. Assistant calls `mythoria.story.read_overview`.
3. Assistant reads a chapter with `mythoria.story.read_chapter`.
4. User says "continue" or "go back".
5. Assistant calls `mythoria.story.read_next_chapter`.
6. Assistant keeps chapter pointer from returned `navigation` payload.

## Communication examples

1. User: "Read chapter 1 of Moon Garden."

- Assistant: calls `mythoria.story.read_chapter` with `chapterNumber=1`, returns chapter and next pointer.

2. User: "Continue."

- Assistant: calls `mythoria.story.read_next_chapter` with `currentChapterNumber`.

3. User: "Give me a short summary of this chapter."

- Assistant: calls `mythoria.story.read_chapter` with `mode=summary`.

4. User: "Show a quick preview first."

- Assistant: calls `mythoria.story.read_overview` with chapter preview enabled.

## Dependencies

- Existing services:
- `storyService.getStoryById`
- `chapterService.getStoryChapters`
- Feature 02 auth/error challenge behavior for private access.
- Feature 04 story selection outputs (`storyId`) as primary upstream selector.
- Existing reader URL conventions from `docs/features/story-reader.md`.
- Feature 11 for embedded reader widget support.

## Implemented

### Tools

Implemented in `src/lib/mcp/server.ts`:

- `mythoria.story.read_overview`
- `mythoria.story.read_chapter`
- `mythoria.story.read_next_chapter`

### Access model

- Tools expose mixed security schemes (`noauth` + OAuth `mythoria.account.read`).
- Public stories can be read anonymously.
- Private stories trigger OAuth challenge metadata with `mythoria.account.read`.

### Reading behavior

- Overview tool returns:
- story metadata
- chapter table of contents
- optional chapter preview payload
- read URLs for private/public contexts when available
- Chapter tool returns:
- chapter text payload by output mode (`full`, `summary`, `excerpt`)
- navigation pointers (`previousChapterNumber`, `nextChapterNumber`)
- structured guidance for next reading actions
- Next-chapter tool returns:
- target chapter for `next`/`previous`
- `boundary_reached` status at story edges

### Validation

- Updated unit tests in `src/lib/mcp/server.test.ts`:
- owner overview retrieval
- anonymous public chapter read
- boundary navigation behavior
- private-story auth challenge behavior
- `tools/list` metadata assertion for mixed `securitySchemes`

## Still missing / follow-up

1. Slug-first public reading resolution:

- Current tools use `storyId` as canonical selector.
- Explicit slug-based lookup helper can be added if needed.

2. Model-visible persisted reading context:

- Chapter pointers are returned in structured payload.
- Deeper read-progress persistence via `ui/update-model-context` is still a follow-up.

3. Embedded reader widget:

- Core reader widget surface is now implemented in Feature 11.
- Advanced reading controls and richer visual polish remain a follow-up.

## Screenshot recommendations

1. Overview with preview:

- `mythoria.story.read_overview` returning chapter list + preview.

2. Chapter full read:

- `mythoria.story.read_chapter` with `mode=full`.

3. Chapter summary read:

- `mythoria.story.read_chapter` with `mode=summary`.

4. Navigation continue:

- `mythoria.story.read_next_chapter` success case.

5. Boundary handling:

- `mythoria.story.read_next_chapter` returning `status=boundary_reached`.

## Copy templates

### Overview template

- "I found {totalChapters} chapters. I can start with chapter 1 or jump to any chapter."

### Chapter template

- "Here is chapter {chapterNumber}: {chapterTitle}. Want me to continue to the next chapter?"

### Summary template

- "Here is a short summary of chapter {chapterNumber}: {summary}"

### Boundary template

- "You are already at the {edge} chapter. I can go the other direction or jump to a specific chapter."

## Acceptance targets

1. Users can read and continue chapters in-chat without switching to web routes.
2. Public/private access boundaries are enforced with explicit auth challenges.
3. Navigation responses always include deterministic next/previous pointers.
