# Feature 11 - ChatGPT UI Components and Surfaces

## Description

This feature introduces rich ChatGPT app UI components for Mythoria, using MCP Apps-compatible patterns.

Goals:

- Improve usability for dense tasks (story setup, story list browsing, chapter navigation).
- Keep UI portable by using MCP Apps bridge first.
- Use ChatGPT-specific extensions only for optional enhancements.

## Workflow

1. MCP server registers UI resources (`text/html;profile=mcp-app`).
2. Tool responses include `_meta.ui.resourceUri` to bind tools to widgets.
3. Widget receives `ui/notifications/tool-result` and renders `structuredContent`.
4. Widget can call tools via `tools/call`.
5. For high-density interactions, widget requests fullscreen display mode.

## Communication examples

1. User: "Show my stories visually."
- Assistant: renders inline story list widget; user selects one and continues.

2. User: "Let me edit the story setup fields quickly."
- Assistant: opens fullscreen creation widget with structured controls.

3. User: "Play chapter 2 audio."
- Assistant: widget renders chapter list with play actions.

4. User: "Close this panel."
- Assistant/widget closes UI and continues in pure chat mode.

## Dependencies

- Feature 03, 04, 05, 06 tools returning stable `structuredContent`.
- MCP Apps bridge support in ChatGPT.
- CSP and widget domain metadata required for submission.
- Frontend asset pipeline for widget bundles.

## Development plan

1. Build initial widget set:
- Story creation form widget
- Story library list widget
- Reader/listener navigation widget

2. Register resources in MCP server:
- use unique resource URIs and versioning strategy.
- define `_meta.ui.csp` and `_meta.ui.domain`.

3. Standardize host bridge client:
- reusable JSON-RPC helper for `ui/*` and `tools/call`.

4. Add responsive and accessibility baseline:
- mobile-first layouts, keyboard support, contrast compliance.

5. Acceptance criteria:
- Widgets render correctly in inline and fullscreen modes.
- Tool-call loops from widget remain stable.
- App remains functional without widget (chat-only fallback).
