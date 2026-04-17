# Feature 11 - ChatGPT UI Components and Surfaces

Status: Implemented (core MCP widget surfaces complete)

## Description

This feature adds first-party ChatGPT widget surfaces for Mythoria using MCP Apps-compatible patterns.

Primary goals:

- Improve high-density UX for story creation, library selection, and reading/listening navigation.
- Keep the implementation portable via MCP Apps standard keys and bridge methods.
- Preserve chat-only fallback for every flow.

## Workflow

1. MCP server registers versioned widget resources with MIME type `text/html;profile=mcp-app`.
2. `tools/list` exposes `_meta.ui.resourceUri` (and ChatGPT compatibility aliases) on bound tools.
3. Tool results include widget binding metadata so host can render the matching component.
4. Widget receives `ui/notifications/tool-result` payloads and renders `structuredContent`.
5. Widget can call `tools/call` for follow-up actions and request fullscreen when needed.

## Communication examples

1. User: "Show my stories visually."

- Assistant calls `mythoria.account.story_list`.
- Story library widget renders a list with select/read/audio actions.

2. User: "Help me finish this draft faster."

- Assistant calls `mythoria.story.update_draft`.
- Story creation widget shows missing fields and one-click generation readiness check.

3. User: "Go to the next chapter."

- Assistant calls `mythoria.story.read_next_chapter`.
- Reader widget shows chapter text and next/previous controls.

4. User: "Close this panel and continue in chat."

- Widget calls `requestClose` (when available) or posts a follow-up chat prompt.

## Dependencies

- Feature 03/04/05/06 structured outputs.
- MCP bridge messaging (`ui/notifications/*`, `tools/call`, `ui/message`, `ui/update-model-context`).
- OAuth Feature 02 for protected tool calls from widget.
- CSP/widget-domain metadata required for ChatGPT app submission.

## Implemented

### Resource registration

Implemented in `src/lib/mcp/server.ts` + `src/lib/mcp/ui-widgets.ts`:

- `ui://mythoria/story-creation-v1.html`
- `ui://mythoria/story-library-v1.html`
- `ui://mythoria/story-reader-v1.html`

Each resource now includes:

- `_meta.ui.prefersBorder`
- `_meta.ui.csp` (`connectDomains`, `resourceDomains`)
- `_meta.ui.domain`
- ChatGPT compatibility aliases:
  - `_meta["openai/widgetDescription"]`
  - `_meta["openai/widgetPrefersBorder"]`
  - `_meta["openai/widgetDomain"]`
  - `_meta["openai/widgetCSP"]`

### Tool descriptor bindings

`tools/list` metadata injection now includes widget bindings for core tools:

- Creation surface: coach + draft/generation tools
- Library surface: `mythoria.account.story_list`, `mythoria.account.story_select`
- Reader/listener surface: read/audio/narration + `mythoria.jobs.status`

Descriptors include:

- `_meta.ui.resourceUri`
- `_meta["openai/outputTemplate"]`
- `_meta["openai/toolInvocation/invoking"]`
- `_meta["openai/toolInvocation/invoked"]`

### Tool result bindings

Structured tool results for bound tools now include widget metadata:

- `_meta.ui.resourceUri`
- `_meta["openai/outputTemplate"]`

This ensures chat remains functional while enabling deterministic widget rendering.

### Widget runtime behavior

Widgets implement:

- `ui/notifications/tool-result` subscription
- `tools/call` follow-up actions
- `ui/message` follow-up prompt
- `ui/update-model-context` hook for selection context
- ChatGPT extension usage when available:
  - `requestDisplayMode({ mode: "fullscreen" })`
  - `requestClose()`

### Validation

- Unit tests updated in `src/lib/mcp/server.test.ts`:
  - tool metadata includes widget bindings
  - tool result metadata includes widget bindings
  - resources are listed/readable with MCP app MIME type
- Playwright smoke tests updated in `tests/playwright/mcp.spec.ts`:
  - widget metadata in `tools/list`
  - widget resources accessible via `resources/list` + `resources/read`

## Still missing / follow-up

1. Dedicated React widget bundles:

- Current widgets are inline HTML/JS templates for speed and portability.
- A dedicated build pipeline (React + component library) is still recommended.

2. UI depth and polish:

- Current widgets provide functional navigation/actions.
- Advanced UX polish (animations, richer form controls, deeper accessibility audits) remains.

3. Submission hardening artifacts:

- Screenshot set and final copy tuning are still needed for Feature 12 submission package.

## Screenshot recommendations

1. Story creation surface:

- Widget showing draft status, missing fields, and "Check Generation" action.

2. Story library surface:

- Widget list view with select/read/audio quick actions.

3. Reader/listener surface:

- Widget with chapter preview + next/previous navigation.

4. Fullscreen transition:

- Same widget in fullscreen display mode.

## Copy templates

### Widget handoff template

- "I loaded a Mythoria panel so you can do this faster. You can still continue in plain chat anytime."

### Creation template

- "Your draft status is visible in the panel. I can run a readiness check before spending credits."

### Reader template

- "Use the panel controls to move chapter-by-chapter, or ask me in chat for summaries."

## Acceptance targets

1. Three core widgets are registered and readable as MCP app resources.
2. Bound tools expose descriptor metadata for deterministic widget rendering.
3. Bound tool results include resource bindings and remain chat-compatible.
4. Widget tool-call loops work for select/read/listen/create follow-ups.
5. App remains fully functional when widgets are unavailable.
