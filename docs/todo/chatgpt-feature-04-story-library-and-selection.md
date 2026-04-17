# Feature 04 - Story Library and Selection

Status: In progress (core MCP backend implemented)

## Description

This feature enables authenticated users to browse and select their Mythoria stories directly inside ChatGPT.

Primary goals:

- List stories with rich metadata and pagination.
- Filter server-side by status/language/audience/style/audio/search query.
- Resolve a specific story by ID/title/query with explicit ambiguity handling.
- Provide safe next-action suggestions for read/listen/edit/share/export/print flows.

## Workflow

1. User asks for their stories.
2. Assistant calls `mythoria.account.story_list` with optional filters and page limit.
3. Assistant optionally follows `nextCursor` for additional pages.
4. User asks to open/select a specific story.
5. Assistant calls `mythoria.account.story_select` with `storyId`, `title`, or `query`.
6. Assistant either:

- proceeds with selected story actions, or
- asks user to disambiguate if multiple matches are returned.

## Communication examples

1. User: "Show my latest published stories in English."

- Assistant: calls `mythoria.account.story_list` with `status=published`, `storyLanguage=en-US`, sorted by `updatedAt desc`.

2. User: "Only stories with audio."

- Assistant: calls `mythoria.account.story_list` with `hasAudio=true`.

3. User: "Open Moon Garden."

- Assistant: calls `mythoria.account.story_select` with `title` or `query`.
- If one match exists, continues to read/listen actions.
- If multiple matches exist, asks the user to choose by `storyId`.

## Dependencies

- Feature 02 auth/scopes (`mythoria.account.read`).
- Existing story data service in `src/db/services.ts`:
- `storyService.getStoriesByAuthor`
- Existing URL conventions for read/listen/edit/share routes.
- Feature 05/06/08 for downstream read/listen/share execution tools.
- Feature 11 for embedded list/picker widgets.

## Implemented

### Tooling

Implemented in `src/lib/mcp/server.ts`:

- Upgraded `mythoria.account.story_list`
- New `mythoria.account.story_select`

### `mythoria.account.story_list` upgrades

- Added server-side filters:
- `status` (single or multiple)
- `storyLanguage`
- `targetAudience`
- `graphicalStyle`
- `hasAudio`
- `query`
- Added cursor pagination:
- `limit`
- `cursor`
- `nextCursor`
- `hasMore`
- Added richer story metadata:
- `chapterCount`
- `hasAudio`
- `storyGenerationStatus`
- `storyGenerationCompletedPercentage`
- read/listen/edit/public URLs when applicable
- Added per-story `nextActions` recommendations based on story state.

### `mythoria.account.story_select`

- Resolves story by:
- `storyId` (exact)
- `title`
- `query`
- Returns structured selection state:
- `selected`
- `ambiguous`
- `not_found`
- Returns candidate matches and disambiguation guidance for ambiguous requests.

### Auth + metadata

- Both tools require OAuth scope `mythoria.account.read`.
- `tools/list` metadata exposes `securitySchemes` for `mythoria.account.story_select`.

### Validation

- Updated tests in `src/lib/mcp/server.test.ts`:
- filtered/paginated listing behavior
- selection exact match and ambiguous match behavior
- unauthenticated auth challenge behavior for new tool
- `tools/list` scope metadata assertions
- Updated Playwright MCP auth check in `tests/playwright/mcp.spec.ts` for `mythoria.account.story_select`.

## Still missing / follow-up

1. Embedded ChatGPT library UI:

- Core embedded list/picker widget is now implemented in Feature 11.
- Advanced list interactions (bulk actions/saved filters) remain a follow-up.

2. Direct MCP read/listen/share action tools:

- Feature 04 now recommends actions and URLs.
- Dedicated execution tools for reading/listening/sharing remain in Feature 05/06/08.

3. Large-library optimization at DB query layer:

- Current implementation filters/sorts in MCP after fetching author stories.
- If large libraries become common, add DB-level pagination/filtering service methods.

## Screenshot recommendations

1. Filtered library listing:

- `mythoria.account.story_list` with `status=published`, `storyLanguage=en-US`.

2. Pagination flow:

- First page and follow-up page using `nextCursor`.

3. Story selection success:

- `mythoria.account.story_select` returning `selection.status=selected`.

4. Ambiguous selection:

- `mythoria.account.story_select` returning `selection.status=ambiguous` with candidates.

5. Not-found handling:

- `mythoria.account.story_select` returning `selection.status=not_found` with guidance.

## Copy templates

### Library list template

- "I found {returned} of {total} stories. Tell me which one you want to open."

### Selection disambiguation template

- "I found multiple matches. Please pick one by story ID: {candidateIds}."

### Suggested actions template

- "For this story, you can: read now, listen, edit, share, export, or request print."

### Missing-audio template

- "This story has no audio yet. I can request audiobook generation now."

## Acceptance targets

1. Users can find a target story in two turns or less for common titles.
2. Ambiguous story names always return explicit candidate IDs.
3. Story list supports deterministic cursor pagination with stable sorting.
