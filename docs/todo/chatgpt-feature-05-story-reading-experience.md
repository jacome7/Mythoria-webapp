# Feature 05 - Story Reading Experience

## Description

This feature allows users to read Mythoria stories directly in ChatGPT.

It supports:

- Loading full story content (cover-level summary + chapters).
- Chapter-by-chapter navigation.
- Public and private reading paths.
- Optional jump to fullscreen reader widget for long content.

## Workflow

1. User selects a story from library or asks to read by title.
2. App fetches story metadata and chapter list.
3. Assistant shows concise summary and first chapter snippet.
4. User asks for next chapter, previous chapter, or specific chapter.
5. App returns requested chapter content.
6. Assistant keeps reading context (current chapter pointer).

## Communication examples

1. User: "Read chapter 1 of The Moon Garden."
- Assistant: returns chapter 1 with option for next chapter.

2. User: "Continue."
- Assistant: fetches next chapter and resumes.

3. User: "Jump to chapter 5."
- Assistant: fetches chapter 5 and confirms position.

4. User: "Show only a short summary of this chapter."
- Assistant: summarizes chapter content instead of full render.

## Dependencies

- Existing endpoints:
- `GET /api/stories/{storyId}/chapters`
- `GET /api/stories/{storyId}/chapters/{chapterNumber}`
- Public routes `GET /api/p/{slug}` and chapter equivalent
- Existing reader data conventions from `docs/features/story-reader.md`
- Feature 04 story selection
- Feature 11 reader UI component

## Development plan

1. Add MCP reading tools:
- `stories.readOverview`
- `stories.readChapter`
- `stories.readNextChapter`

2. Add chapter navigation state:
- store current chapter in model-visible context via `ui/update-model-context`.

3. Add output modes:
- full chapter text mode
- summary mode
- quote/excerpt mode (bounded length)

4. Add access handling:
- private stories require auth
- public stories route through slug tools

5. Acceptance criteria:
- User can complete a full chapter navigation session without leaving chat.
- Chapter index errors are handled gracefully.
- Public/private access boundaries are respected.
