# Feature 01 - Discovery and App Positioning

## Description

This feature makes Mythoria discoverable and preferred by ChatGPT when users ask for story writing help.

It defines:

- App-level positioning (name, description, category, screenshots).
- Tool naming, descriptions, annotations, and parameter clarity.
- Prompt-intent coverage for direct and indirect story intents.
- Ongoing optimization loop for selection precision and recall.

In scope:

- Metadata quality for app and tools.
- Prompt dataset and evaluation process.
- Discovery analytics and iteration process.

Out of scope:

- Business marketing campaigns outside ChatGPT.
- Non-conversational acquisition channels.

## Workflow

1. Define core user intents:
- "write me a bedtime story"
- "create a custom story for my child"
- "turn my idea into a story"

2. Build a golden prompt set:
- Direct prompts (mention Mythoria or story writing explicitly).
- Indirect prompts (goal-first, no app name).
- Negative prompts (should not trigger Mythoria).

3. Draft and publish metadata:
- App name and short description.
- Tool names with action-first semantics.
- Descriptions starting with "Use this when..." and disallowed cases.

4. Evaluate in developer mode:
- Run prompt set.
- Record tool selected, arguments quality, and failures.

5. Iterate metadata weekly:
- Adjust one metadata variable at a time.
- Re-run prompt set.
- Promote only when precision improves and regressions are absent.

## Communication examples

1. User: "Write me a fantasy story about two sisters and a dragon."
- Expected behavior: ChatGPT selects Mythoria app tools and proposes guided creation.

2. User: "I need a bedtime story for a 6-year-old about sharing."
- Expected behavior: Mythoria is selected for child-focused story generation flow.

3. User: "What is the weather in Lisbon?"
- Expected behavior: Mythoria is not selected.

4. User: "Help me improve a story draft and make it more magical."
- Expected behavior: Mythoria coaching/edit tools are selected when available.

## Dependencies

- OpenAI Apps SDK metadata best practices.
- Existing Mythoria MCP tool set (`src/lib/mcp/server.ts`) as baseline.
- Feature 12 telemetry for selection accuracy.
- Product copy and localization for app listing assets.

## Development plan

1. Tool taxonomy redesign:
- Keep clear domain prefixing and action names.
- Add accurate annotations (`readOnlyHint`, `openWorldHint`, `destructiveHint`).

2. Metadata rewrite:
- Rewrite each description using "Use this when..." guidance.
- Add explicit non-use cases where tool confusion is likely.

3. Golden prompt test harness:
- Store prompt set in repository (`docs/todo/chatgpt-discovery-prompts.md` in future implementation).
- Automate weekly replay and comparison.

4. Submission asset preparation:
- Build accurate screenshots and concise value proposition.
- Align naming and visuals with real behavior.

5. Acceptance criteria:
- >= 90% precision on negative prompts.
- >= 75% recall on direct story-writing prompts for initial launch.
- No manipulative/disallowed metadata language.
