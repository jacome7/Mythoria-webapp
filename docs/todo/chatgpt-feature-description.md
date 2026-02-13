# Mythoria ChatGPT App - Feature Description

Date: 2026-02-10
Owner: Mythoria Web App Team
Status: Draft for implementation kickoff

## 1. Objective

Build and publish a fully functional ChatGPT App for Mythoria that:

1. Improves discovery when users ask ChatGPT to create stories.
2. Lets users create, read, and listen to Mythoria stories directly in ChatGPT.
3. Provides Mythoria guidance and writing help.
4. Meets ChatGPT app quality, safety, privacy, and submission requirements.

## 2. Research Inputs

### OpenAI and ecosystem references
- Apps SDK quickstart: https://developers.openai.com/apps-sdk/quickstart/
- Build your MCP server: https://developers.openai.com/apps-sdk/build/mcp-server/
- Build your ChatGPT UI: https://developers.openai.com/apps-sdk/build/chatgpt-ui/
- MCP Apps compatibility in ChatGPT: https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt/
- Authentication for Apps SDK: https://developers.openai.com/apps-sdk/build/auth/
- UX principles: https://developers.openai.com/apps-sdk/concepts/ux-principles/
- UI guidelines: https://developers.openai.com/apps-sdk/concepts/ui-guidelines/
- Optimize metadata: https://developers.openai.com/apps-sdk/guides/optimize-metadata/
- Research use cases: https://developers.openai.com/apps-sdk/plan/use-case/
- Test your integration: https://developers.openai.com/apps-sdk/deploy/testing/
- Submit your app: https://developers.openai.com/apps-sdk/deploy/submission/
- App submission guidelines: https://developers.openai.com/apps-sdk/app-submission-guidelines/
- OpenAI blog: What makes a great ChatGPT app: https://developers.openai.com/blog/what-makes-a-great-chatgpt-app/
- OpenAI update: Introducing ChatGPT agent mode for Plus, Pro, and Team users: https://openai.com/index/introducing-chatgpt-agent-for-plus-pro-and-team-users/
- MCP authorization spec: https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
- MCP Apps extension docs: https://modelcontextprotocol.io/docs/extensions/apps

### Mythoria internal references

- `docs/features.md`
- `docs/features/story-creation.md`
- `docs/features/story-reader.md`
- `docs/features/audiobook.md`
- `docs/features/story-library-console.md`
- `docs/features/story-sharing.md`
- `docs/features/credits-payments.md`
- `docs/features/get-inspired.md`
- `docs/mcp.md`
- `src/lib/mcp/server.ts`

## 3. Current State Summary (Mythoria MCP)

Current MCP tools already implemented:

- Public: `health-check`, `faq.list`, `faq.query`, `credits.purchaseOptions`
- Authenticated: `stories.listMine`, `credits.usage`, `transactions.list`, `stories.requestDownload`, `stories.requestPrint`, `stories.requestNarrate`

Current strengths:

- Solid FAQ and account-related read operations.
- Clerk-backed user resolution already working for authenticated tools.
- Existing web APIs for story creation, reading, audiobook generation, and sharing can be reused.

Current gaps vs objective:

- No MCP tools yet for end-to-end story creation.
- No direct read/listen tools with chapter content/audio links for ChatGPT use.
- Fulfillment actions return queued job stubs but no real job tracking tool.
- No Apps SDK UI resource registration for rich ChatGPT widgets.
- No OAuth 2.1 MCP auth flow yet (required for broad publishable authenticated app flow).
- Tool metadata/annotations need optimization for model discovery and safe tool selection.

## 4. Priority Alignment to Requested Objectives

P0 objectives mapped to implementation priorities:

1. Discovery first:
- Feature 01 (Discovery and App Positioning)
- Feature 12 (Testing, analytics, and submission readiness)

2. Usage instead of web app:
- Feature 03 (Story Creation Assistant)
- Feature 04 (Story Library and Selection)
- Feature 05 (Story Reading Experience)
- Feature 06 (Story Listening and Audiobook)
- Feature 07 (Mythoria Knowledge and Writing Coach)

## 5. Proposed Feature Documents

1. [Feature 01 - Discovery and App Positioning](chatgpt-feature-01-discovery-and-app-positioning.md)
2. [Feature 02 - Account Linking and Authentication](chatgpt-feature-02-account-linking-and-authentication.md)
3. [Feature 03 - Story Creation Assistant](chatgpt-feature-03-story-creation-assistant.md)
4. [Feature 04 - Story Library and Selection](chatgpt-feature-04-story-library-and-selection.md)
5. [Feature 05 - Story Reading Experience](chatgpt-feature-05-story-reading-experience.md)
6. [Feature 06 - Story Listening and Audiobook](chatgpt-feature-06-story-listening-and-audiobook.md)
7. [Feature 07 - Mythoria Knowledge and Writing Coach](chatgpt-feature-07-mythoria-knowledge-and-writing-coach.md)
8. [Feature 08 - Story Sharing and Collaboration](chatgpt-feature-08-story-sharing-and-collaboration.md)
9. [Feature 09 - Credits and Eligibility Guardrails](chatgpt-feature-09-credits-and-eligibility-guardrails.md)
10. [Feature 10 - Job Tracking and Notifications](chatgpt-feature-10-job-tracking-and-notifications.md)
11. [Feature 11 - ChatGPT UI Components and Surfaces](chatgpt-feature-11-ui-components-and-chatgpt-surfaces.md)
12. [Feature 12 - Quality, Testing, Observability, and Submission](chatgpt-feature-12-quality-testing-observability-and-submission.md)

## 6. Delivery Phases

### Phase 1 - Publishable foundation

- Implement Feature 01, 02, 12 core requirements.
- Upgrade MCP auth and tool metadata quality.
- Create golden prompt set and discovery tests.

### Phase 2 - Core storytelling loop in chat

- Implement Feature 03, 04, 05, 06.
- Ensure authenticated users can create, list, read, and listen.

### Phase 3 - Mythoria assistant quality layer

- Implement Feature 07 and Feature 10.
- Improve coaching quality, follow-ups, and long-running status handling.

### Phase 4 - Expansion and growth

- Implement Feature 08 and selective parts of Feature 09.
- Refine advanced sharing and monetization-safe patterns.

## 7. Risk Assessment

### Policy and distribution risks

1. Digital credits commerce risk:
- ChatGPT app submission policy currently disallows selling digital goods/services (including credits) inside apps.
- Mitigation: keep credits features informational and eligibility-focused in ChatGPT app; avoid in-app digital purchase flows.

2. Discoverability risk:
- App suggestions depend on metadata quality and utility signals, not only technical integration.
- Mitigation: metadata optimization loop, prompt set evaluation, and high quality tool descriptions.

3. Privacy/data minimization risk:
- Over-broad tool inputs/outputs can cause rejection.
- Mitigation: strict schema minimization, no raw chat log pull, no unnecessary identifiers in outputs.

### Technical risks

1. OAuth migration complexity:
- Current auth pattern uses raw Clerk JWT expectation; publishable app flow needs standards-compliant OAuth discovery and token verification.
- Mitigation: implement MCP OAuth resource metadata and staged rollout with mixed auth.

2. Async fulfillment mismatch:
- Existing tools return synthetic job IDs without real status tracking.
- Mitigation: add persistent job tracking tool and status model.

3. UI portability risk:
- If implementation over-relies on ChatGPT-specific APIs, portability is reduced.
- Mitigation: build around MCP Apps bridge (`ui/*`) first, use `window.openai` only where needed.

### Product risks

1. Conversation-to-form friction:
- Story creation is a 5-step web wizard; direct chat flow may become too verbose.
- Mitigation: use guided short-turn collection and optional structured UI in fullscreen for dense inputs.

2. Content safety and quality:
- Story outputs and coaching responses can vary in quality.
- Mitigation: explicit prompt standards, output checks, user confirmation for key edits, and feedback loops.

## 8. Definition of Success

A successful Mythoria ChatGPT App launch includes:

1. High precision app/tool selection for story-creation intent prompts.
2. End-to-end authenticated creation and consumption loop in chat.
3. Submission-ready compliance and stable production operations.
4. Positive usage signals (repeat use, completion rate, low error rate).
