# Feature 04 - Story Library and Selection

## Description

This feature lets users browse and select their stories inside ChatGPT without opening the web app.

It focuses on:

- Listing stories with clear metadata.
- Filtering by status/language/audience.
- Fast selection for follow-up actions (read, listen, edit, share).

## Workflow

1. User asks for their stories.
2. App fetches user stories and returns summarized list.
3. User narrows results (for example: "only published in English").
4. User selects one story by title or ID.
5. Assistant offers context actions:
- read now
- listen if audio exists
- generate audiobook if missing
- share link

## Communication examples

1. User: "Show my latest stories."
- Assistant: lists top items with status and updated date.

2. User: "Only the published ones for children."
- Assistant: filters and returns matching subset.

3. User: "Open The Moon Garden."
- Assistant: resolves story and proposes read/listen actions.

## Dependencies

- Existing `stories.listMine` MCP tool.
- Existing `/api/my-stories` and `/api/my-stories/{storyId}` endpoints.
- Feature 05 and 06 for downstream actions.
- Feature 11 for optional list and picker UI widget.

## Development plan

1. Enhance `stories.listMine` output:
- add pagination cursor support
- add optional server-side filter inputs
- include hasAudio and chapterCount where available

2. Add story resolver tool:
- `stories.resolveByTitle` to reduce title ambiguity.

3. Add safe action suggestions:
- model receives explicit recommended next actions based on story state.

4. Add UI card/list component:
- compact inline list + fullscreen table view for large libraries.

5. Acceptance criteria:
- User can locate a target story in <= 2 follow-up turns.
- Ambiguous titles handled with disambiguation prompts.
- Large libraries remain responsive.
