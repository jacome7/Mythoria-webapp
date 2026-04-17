# ChatGPT Discovery - Manual Evaluation

Status: active
Owner: Mythoria product + engineering

## Goal

Measure how often Mythoria is correctly selected for story intents, and not selected for non-story intents.

## Prompt sets

### Direct intent prompts

- "Write me a bedtime story for a 6-year-old about sharing."
- "Create a fantasy story about two sisters and a dragon."
- "Turn my idea into a short illustrated story."
- "Help me make my story draft more magical."

### Indirect intent prompts

- "I need a custom story for tonight."
- "I want a personalized story with pictures."
- "Can you help me build a story with chapters?"

### Negative prompts

- "What is the weather in Lisbon?"
- "Summarize this meeting transcript."
- "Convert this CSV to JSON."
- "Find cheap flights to Madrid."

## Run procedure

1. Run each prompt in ChatGPT with Mythoria app available.
2. Record:

- Prompt
- Was Mythoria selected (`yes/no`)
- First tool called
- Argument quality (`good/partial/bad`)
- Result quality (`good/partial/bad`)
- Notes

3. Repeat for each supported locale where practical (`en-US`, `pt-PT`, `es-ES`, `fr-FR`, `de-DE`).

## Scoring

1. Discovery precision (negative prompts):

- `correct_non_selection / total_negative_prompts`

2. Discovery recall (direct prompts):

- `correct_selection / total_direct_prompts`

3. First-tool appropriateness:

- `% of direct prompts where first tool is one of`
  - `mythoria.discovery.capabilities`
  - `mythoria.discovery.sample_story_preview`
  - `mythoria.discovery.featured_stories`

## Target thresholds

- Negative precision: >= 90%
- Direct recall: >= 75%
- Appropriate first-tool rate: >= 80%

## Log evidence

- Capture server logs with `[mcp-tool]` lines.
- Keep evidence in app logs only (no DB changes).
