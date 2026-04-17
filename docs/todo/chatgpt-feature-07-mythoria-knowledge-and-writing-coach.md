# Feature 07 - Mythoria Knowledge and Writing Coach

Status: Implemented (core MCP backend complete)

## Description

This feature delivers Mythoria guidance and writing help directly in ChatGPT.

Primary goals:

- Keep factual product/account guidance grounded in FAQ tools.
- Provide practical writing coaching with structured outputs.
- Route users cleanly from coaching into story creation tools.

## Workflow

1. User asks a Mythoria question or writing-help request.
2. Assistant calls `mythoria.coach.story_guidance`.
3. Tool classifies intent:

- product/account info -> route to FAQ tools
- direct creation request -> route to creation tools
- creative coaching -> return checklist/hints/examples

4. Assistant follows recommended next tools from payload:

- `mythoria.help.search` / `mythoria.help.browse`
- `mythoria.story.create_draft` / `mythoria.story.update_draft`
- or iterative coaching turns.

## Communication examples

1. User: "How many credits do I need for audiobook generation?"

- Assistant: calls `mythoria.coach.story_guidance`, gets `route_to_faq`, then uses `mythoria.help.search`.

2. User: "Give me better opening ideas for a fantasy story for age 8."

- Assistant: calls `mythoria.coach.story_guidance`, returns concise checklist + audience/style hints + opening example.

3. User: "Start creating this story now."

- Assistant: calls `mythoria.coach.story_guidance`, gets `route_to_creation`, then starts Feature 03 draft flow.

## Dependencies

- Existing FAQ tools:
- `mythoria.help.browse`
- `mythoria.help.search`
- Existing story enums used for coaching context:
- `TargetAudience`
- `NovelStyle`
- Feature 03 tools for creation handoff:
- `mythoria.story.create_draft`
- `mythoria.story.update_draft`
- `mythoria.story.add_characters`

## Implemented

### Tooling

Implemented in `src/lib/mcp/server.ts`:

- `mythoria.coach.story_guidance`

### Intent routing behavior

- Classifies incoming requests into:
- `product_info`
- `story_creation_request`
- `creative_coaching`
- For factual product/account intents, payload routes to FAQ tools.
- For direct creation intents, payload routes to Feature 03 tools.

### Coaching payload behavior

- Returns structured coaching output with:
- checklist
- audience hints
- style hints
- revision prompts
- optional example opening guidance
- Includes `recommendedNextTools` for seamless follow-up.

### Localization

- Localized copy templates available from day one for:
- `en-US`, `pt-PT`, `es-ES`, `fr-FR`, `de-DE`

### Validation

- Added unit tests in `src/lib/mcp/server.test.ts`:
- product-info routing path
- creative coaching output path
- Added Playwright MCP smoke check in `tests/playwright/mcp.spec.ts`.

## Still missing / follow-up

1. Retrieval-augmented coaching quality:

- Current coaching logic is template/rules-based.
- Future iteration can include richer content-quality scoring and examples from style guides.

2. Embedded coaching UI:

- Coach responses are now widget-bound through Feature 11 core surfaces.
- A dedicated coaching-specific widget (beyond the shared creation surface) remains a follow-up.

## Screenshot recommendations

1. Product routing:

- `mythoria.coach.story_guidance` returning `status=route_to_faq`.

2. Creative coaching:

- `mythoria.coach.story_guidance` returning `status=coaching_ready` with checklist and opening example.

3. Creation routing:

- `mythoria.coach.story_guidance` returning `status=route_to_creation`.

## Copy templates

### Product-routing template

- "That is a Mythoria account/pricing question. I will check the FAQ tools for an exact answer."

### Coaching template

- "Here is a focused writing plan: checklist, audience/style hints, and one opening example."

### Creation-handoff template

- "You are ready to start. I will create a draft and collect only the missing required fields."

## Acceptance targets

1. Product/account questions are routed to FAQ-backed answer flow.
2. Creative coaching returns concise, actionable structured guidance.
3. Users can move from coaching to creation flow without manual context reset.
