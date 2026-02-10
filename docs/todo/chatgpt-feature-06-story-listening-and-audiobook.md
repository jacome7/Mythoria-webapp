# Feature 06 - Story Listening and Audiobook

## Description

This feature enables listening flows in ChatGPT:

- Listen when audiobook already exists.
- Start audiobook generation when missing.
- Check narration progress and return playable chapter links.

It mirrors existing Mythoria audiobook behavior but adapts it to chat-first interaction.

## Workflow

1. User asks to listen to a story.
2. App checks whether audio exists for story chapters.
3. If audio exists:
- return playable chapter options and start point.
4. If audio missing:
- ask for voice and music preference.
- validate credits and trigger generation.
- provide progress updates via job/status tool.
5. User requests chapter-specific playback links.

## Communication examples

1. User: "Play The Moon Garden."
- Assistant: "Audio exists. Start from chapter 1 or choose a chapter?"

2. User: "Generate audiobook with a warm voice and no background music."
- Assistant: validates credits, queues generation, returns tracking ID.

3. User: "Is the audiobook ready yet?"
- Assistant: checks status and reports percent/state.

4. User: "Give me chapter 3 audio link."
- Assistant: returns authenticated or public proxy URL depending on access.

## Dependencies

- Existing endpoints:
- `POST /api/stories/{storyId}/generate-audiobook`
- `GET /api/stories/{storyId}` for audiobook state
- `GET /api/stories/{storyId}/audio/{chapterIndex}`
- `GET /api/p/{slug}/audio/{chapterIndex}`
- Existing narration pricing/credits services.
- Feature 10 job tracking.
- Feature 09 eligibility and credits communication.

## Development plan

1. Extend MCP audio tools:
- `stories.audioStatus`
- `stories.startNarration`
- `stories.getAudioChapter`

2. Replace synthetic narration queue responses:
- route to real audiobook generation endpoint.
- persist returned run/job references.

3. Add voice catalog tool:
- expose supported voices and localized descriptions.

4. Add status polling pattern:
- use dedicated status tool instead of repeated full story fetch.

5. Acceptance criteria:
- Existing-audio path works in one turn.
- Missing-audio path reaches queued state with transparent credit communication.
- Chapter audio retrieval is reliable and access-controlled.
