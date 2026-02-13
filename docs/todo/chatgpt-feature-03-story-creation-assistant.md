# Feature 03 - Story Creation Assistant

## Description

This feature enables end-to-end story creation directly in ChatGPT using Mythoria capabilities.

It translates the existing 5-step web wizard into a conversational flow that can optionally open a rich UI component for structured inputs.

Creation must support:

- Story seed collection (idea, audience, style, language).
- Optional characters and setting details.
- Story generation kickoff and progress communication.

## Workflow

1. User asks to create a story.
2. Mythoria creation tool starts a draft story session.
3. Assistant collects required fields in minimal turns:
- title or provisional title
- target audience
- novel style
- graphical style
4. Optional enrichment:
- characters
- setting
- outline
- extra instructions
5. Assistant asks for confirmation.
6. Mythoria triggers generation workflow.
7. Assistant reports status and completion with read/listen next actions.

## Communication examples

1. User: "Create a story about a shy fox learning courage."
- Assistant: asks audience/style clarifiers, then starts generation.

2. User: "Write in Portuguese for ages 7-10, watercolor style."
- Assistant: updates draft parameters and confirms final brief.

3. User: "Use these two characters: Mia and Joao, siblings."
- Assistant: adds characters before generation.

4. User: "Start now."
- Assistant: calls complete/generate action and returns run/job status.

## Dependencies

- Existing story endpoints:
- `POST /api/stories`
- `POST /api/stories/genai-structure`
- `PUT /api/my-stories/{storyId}`
- `POST /api/stories/complete`
- Character endpoints under `/api/characters` and `/api/stories/{storyId}/characters`
- Credits validation and deduction endpoints.
- Feature 02 authenticated access.
- Feature 10 job/progress tracking.

## Development plan

1. Add MCP creation tools:
- `stories.createDraft`
- `stories.updateDraft`
- `stories.addCharacters`
- `stories.startGeneration`

2. Add schema constraints:
- enums for audience/style/language
- explicit required fields
- data minimization and safe defaults

3. Add structured responses:
- return concise `structuredContent` for model
- keep large generation state in `_meta` for widget

4. Add conversational guardrails:
- ask only missing fields
- avoid repeating confirmed values
- provide concise summaries before final submission

5. Acceptance criteria:
- User can create and start a story with <= 6 assistant turns in common path.
- Generation request is reliably queued and status is trackable.
- Invalid inputs receive actionable correction prompts.
