# Mythoria ChatGPT App - Feature Description

Date: 2026-02-11
Owner: Mythoria Web App Team
Status: Active implementation (Phase 4 core sharing + eligibility complete)

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

- Public discovery/help/catalog:
  - `mythoria.discovery.ping`
  - `mythoria.discovery.capabilities`
  - `mythoria.discovery.featured_stories`
  - `mythoria.discovery.sample_story_preview`
  - `mythoria.help.browse`
  - `mythoria.help.search`
  - `mythoria.coach.story_guidance`
  - `mythoria.catalog.credit_packages`
  - `mythoria.story.voice_catalog`
- Authenticated account/fulfillment:
  - `mythoria.account.story_list`
  - `mythoria.account.story_select`
  - `mythoria.story.read_overview`
  - `mythoria.story.read_chapter`
  - `mythoria.story.read_next_chapter`
  - `mythoria.story.audio_status`
  - `mythoria.story.audio_chapter`
  - `mythoria.story.share_state`
  - `mythoria.story.share_create_link`
  - `mythoria.story.share_revoke_link`
  - `mythoria.account.credit_usage`
  - `mythoria.credits.check_eligibility`
  - `mythoria.account.payment_history`
  - `mythoria.story.create_draft`
  - `mythoria.story.update_draft`
  - `mythoria.story.add_characters`
  - `mythoria.story.start_generation`
  - `mythoria.story.export_request`
  - `mythoria.story.print_request`
  - `mythoria.story.narration_request`
  - `mythoria.jobs.status`

Current strengths:

- Discovery-first public toolset now includes noauth sample previews.
- Clerk-backed user resolution already working for authenticated tools.
- Feature 02 core backend now implemented:
  - OAuth protected resource metadata endpoint.
  - Per-tool `securitySchemes` in `tools/list`.
  - Runtime `_meta["mcp/www_authenticate"]` challenges for protected tools.
- Existing web APIs for story creation, reading, audiobook generation, and sharing can be reused.
- Feature 03 core backend now implemented:
  - Story draft creation/update tools with required-field readiness state.
  - Character linking/creation tool for draft enrichment.
  - Generation start tool with credit preview, explicit confirmation, and queue trigger.
- Feature 04 core backend now implemented:
  - Story library tool supports server-side filters and cursor pagination.
  - Story selection resolver handles exact, ambiguous, and not-found flows.
  - Story list/select payloads include recommended next actions for read/listen/edit/share/export/print.
- Feature 05 core backend now implemented:
  - Reading overview/chapter/navigation tools are available.
  - Tools support output modes (`full`, `summary`, `excerpt`) and chapter navigation pointers.
  - Public reading works anonymously while private reading requires OAuth challenge.
- Feature 06 core backend now implemented:
  - Listening status and chapter stream retrieval tools are available.
  - Voice catalog tool exposes provider-specific narration voices.
  - Narration request now performs real credit checks and queues real audiobook workflow.
- Feature 07 core backend now implemented:
  - Story coaching tool with intent routing (`product_info`, `story_creation_request`, `creative_coaching`).
  - Localized coaching templates and structured coaching payloads are available.
  - Product/account intents route to FAQ tools; creation intents route to draft tools.
- Feature 10 core backend now implemented:
  - Unified job status tool (`mythoria.jobs.status`) is available.
  - Generation/export/print/narration tools now emit trackable Mythoria job IDs.
  - Normalized status contract (`state`, `progress`, `etaSeconds`, `nextAction`) is available across job types.
- Feature 11 core UI surfaces now implemented:
  - MCP app widget resources are registered for creation, library, and reader/listener flows.
  - Bound tools now expose `_meta.ui.resourceUri` plus compatibility metadata in `tools/list`.
  - Structured tool results include widget binding metadata while preserving chat-only fallback.
- Feature 08 core backend now implemented:
  - Story sharing state, creation, and revocation tools are available.
  - Public share activation requires explicit confirmation.
  - Revocation operations require explicit confirmation and destructive annotations.
- Feature 09 core backend now implemented:
  - New eligibility helper tool (`mythoria.credits.check_eligibility`) is available.
  - Action-level eligibility supports ebook, audiobook, print, and combined story-generation checks.
  - Policy-aware guidance avoids in-chat digital purchase execution.
- Submission metadata hardening now implemented:
  - Write/destructive tools include `openWorldHint` and `destructiveHint` coverage where applicable.

Current gaps vs objective:

- Export and print actions now expose status lookup paths, but fulfillment remains partially synthetic in MCP and should be tightened with dedicated backend workflow/status sources.
- Story creation multimodal structuring bridge (`/api/stories/genai-structure`) is not yet exposed as MCP creation tooling.
- Story library filtering/pagination currently happens in MCP after full author-story fetch; DB-level pagination optimization may be needed for very large libraries.
- Remaining Feature 02 tasks are mostly operational:
  - Final Clerk OAuth tenant/redirect validation in ChatGPT.
  - Manual production linking tests and rollout hardening.

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

Status: Completed (2026-02-11, core backend scope)

- Implemented Feature 03, 04, 05, 06 core MCP flows.
- Authenticated users can create, list, read, and listen in chat.
- Remaining follow-ups for this phase are advanced UX polish and submission hardening.

### Phase 3 - Mythoria assistant quality layer

Status: Completed (2026-02-11, core backend scope)

- Implemented Feature 07 and Feature 10 core MCP flows.
- Added coaching intent-routing and normalized async job tracking in chat.
- Implemented Feature 11 core widget surfaces for creation/library/reader-listener interactions.
- Remaining follow-ups for this phase are quality tuning and submission readiness in Feature 12.

### Phase 4 - Expansion and growth

Status: In progress (2026-02-11)

- Feature 08 core sharing flows implemented in MCP.
- Feature 09 core eligibility helper implemented in MCP.
- Remaining work is advanced quality tuning, usage analytics, and submission packaging polish.

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

2. Async fulfillment precision:

- Job tracking is now implemented, but some job states (especially export/print) still rely on indirect signals.
- Mitigation: add richer backend status sources and optional persistent run registry.

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
