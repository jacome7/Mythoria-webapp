# MCP Server for Mythoria

The Mythoria MCP server is exposed at `/api/mcp` using Streamable HTTP transport with JSON responses enabled.

## Authentication

- Current mode: mixed auth (`noauth` + OAuth 2.1).
- Public tools are callable anonymously.
- Account/story write tools require OAuth access tokens.
- Auth failures for protected tools return MCP tool errors with `_meta["mcp/www_authenticate"]` so ChatGPT can trigger account linking UI.

## OAuth Metadata Endpoints

- MCP endpoint: `https://mythoria.pt/api/mcp`
- Protected resource metadata: `https://mythoria.pt/.well-known/oauth-protected-resource`
- Authorization server metadata (Clerk): `https://<clerk-frontend-api>/.well-known/oauth-authorization-server`

### How authorization server URL is resolved

1. Preferred: `MCP_AUTHORIZATION_SERVER_URL` env var.
2. Fallback: decode `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and derive Clerk frontend API URL.

For current production config, the publishable key resolves to `clerk.mythoria.pt`, so the authorization server base URL is:

- `https://clerk.mythoria.pt`

You can confirm this in Clerk Dashboard via the frontend/API domain settings, then append:

- `/.well-known/oauth-authorization-server`

## Configure with OpenClaw (remote MCP)

- Use transport **streamable-http** (not SSE). In `openclaw.json`, set `"transport": "streamable-http"` for this URL.
- Send `Authorization: Bearer <clerk_jwt>` on requests when agents need authenticated tools; anonymous tools work with an empty or omitted user context depending on client behavior.
- If OpenClaw logs SSE or EventSource errors against `https://mythoria.pt/api/mcp`, the transport is misconfigured.

## Configure with ChatGPT

1. Open **Settings -> Apps -> Advanced settings** in ChatGPT and enable **Developer mode**.
2. Open **Settings -> Apps** and click **Create app**.
3. Use endpoint `https://mythoria.pt/api/mcp`.
4. Ensure Clerk OAuth app configuration includes ChatGPT redirect URIs:
   - `https://chatgpt.com/connector_platform_oauth_redirect`
   - `https://platform.openai.com/apps-manage/oauth`
5. In the app details page, refresh tools and enable desired tools for testing.
6. Test with `mythoria.discovery.ping`.
7. For discovery prompts, start with `mythoria.discovery.capabilities` or `mythoria.discovery.sample_story_preview`.

## Tool Taxonomy (v0.9.0)

### MCP App UI Resources

Registered MCP app widget templates (`text/html;profile=mcp-app`):

- `ui://mythoria/story-creation-v1.html`
  - Creation/status surface for coaching + draft/generation tools.
- `ui://mythoria/story-library-v1.html`
  - Story list/selection surface for library navigation.
- `ui://mythoria/story-reader-v1.html`
  - Chapter + audiobook navigation surface for read/listen/status flows.

Resource metadata now includes:

- `_meta.ui.prefersBorder`
- `_meta.ui.csp`
- `_meta.ui.domain`
- ChatGPT compatibility aliases (`openai/widgetDescription`, `openai/widgetCSP`, etc.)

### Public tools (no auth)

- `mythoria.discovery.ping`
  - Readiness probe (`ok`).
- `mythoria.discovery.capabilities`
  - Discovery metadata and app positioning hints.
- `mythoria.discovery.featured_stories`
  - Curated public stories for quality preview.
- `mythoria.discovery.sample_story_preview`
  - Noauth curated sample preview with image/excerpt/read-link/audio-link when available.
- `mythoria.help.browse`
  - FAQ browse by locale/section/query.
- `mythoria.help.search`
  - FAQ question answering with ranked matches.
- `mythoria.coach.story_guidance`
  - Writing coach with intent routing to FAQ, creation, or creative-coaching flows.
- `mythoria.catalog.credit_packages`
  - Active credit bundle catalog.
- `mythoria.story.voice_catalog`
  - Narration voice options and default voice by configured TTS provider.

### Mixed-access reading/listening tools (noauth + OAuth)

- `mythoria.story.read_overview`
  - Loads reading metadata, chapter list, and optional chapter preview.
- `mythoria.story.read_chapter`
  - Reads a specific chapter with `full`, `summary`, or `excerpt` mode.
- `mythoria.story.read_next_chapter`
  - Continues chapter navigation from a current chapter pointer (`next` or `previous`).
- `mythoria.story.audio_status`
  - Returns audiobook availability, generation status, and per-chapter audio readiness.
- `mythoria.story.audio_chapter`
  - Returns chapter-level stream URLs for audio playback.

Notes:

- Public stories can be read anonymously.
- Private stories return OAuth challenges with `profile`.

### Authenticated tools (OAuth required)

- `mythoria.account.story_list`
- `mythoria.account.story_select`
- `mythoria.account.credit_usage`
- `mythoria.credits.check_eligibility`
- `mythoria.account.payment_history`
- `mythoria.story.share_state`
- `mythoria.story.share_create_link`
- `mythoria.story.share_revoke_link`
- `mythoria.story.create_draft`
- `mythoria.story.update_draft`
- `mythoria.story.add_characters`
- `mythoria.story.start_generation`
- `mythoria.story.export_request`
- `mythoria.story.print_request`
- `mythoria.story.narration_request`
  - Validates credits and queues real audiobook generation workflow.
- `mythoria.jobs.status`
  - Normalized status tracking for story generation, audiobook generation, export, and print.

### Story creation notes

- `mythoria.story.create_draft`
  - Starts a draft with safe defaults and reports missing required fields.
- `mythoria.story.update_draft`
  - Updates story metadata (audience/style/language/outline/etc.) and recomputes readiness.
- `mythoria.story.add_characters`
  - Links existing characters and/or creates new characters and links them.
- `mythoria.story.start_generation`
  - Supports validation mode (`dryRun`) and explicit confirmation (`confirmStart`) before credit spend.
  - Returns readiness + credit estimate when confirmation is missing.
  - Deducts credits and queues workflow when confirmed.
  - Returns a trackable Mythoria `jobId` for `mythoria.jobs.status`.

### Story library notes

- `mythoria.account.story_list`
  - Supports server-side filters (`status`, `storyLanguage`, `targetAudience`, `graphicalStyle`, `hasAudio`, `query`).
  - Supports cursor pagination (`limit`, `cursor`, `nextCursor`).
  - Returns rich per-story metadata (`chapterCount`, `hasAudio`, generation status, URLs, next actions).
  - Tool/result metadata binds this flow to `ui://mythoria/story-library-v1.html`.
- `mythoria.account.story_select`
  - Resolves a target story by `storyId`, `title`, or `query`.
  - Returns `selected`, `ambiguous`, or `not_found` state with candidates and disambiguation guidance.

### Story sharing notes

- `mythoria.story.share_state`
  - Returns public visibility (`isPublic`, `slug`, public URL) and private share links.
  - Supports `includeInactiveLinks` to include revoked/expired links.
- `mythoria.story.share_create_link`
  - Supports sharing `mode`: `public`, `private_view`, `private_edit`.
  - Public sharing requires explicit `confirmPublicExposure=true`.
  - Private sharing supports `expiresInDays` (default 30).
- `mythoria.story.share_revoke_link`
  - Supports single-link revoke (`linkId`) and bulk revoke (`revokeAll=true`).
  - Supports `disablePublic=true` to switch story visibility back to private.
  - Requires explicit `confirmRevoke=true`.

### Story reading notes

- `mythoria.story.read_overview`
  - Returns story metadata, chapter table of contents, URLs, and optional preview payload.
  - Tool/result metadata binds this flow to `ui://mythoria/story-reader-v1.html`.
- `mythoria.story.read_chapter`
  - Returns chapter content, summary, navigation pointers, and read URLs.
- `mythoria.story.read_next_chapter`
  - Navigates from a `currentChapterNumber` and returns either the target chapter or `boundary_reached`.

### Story listening notes

- `mythoria.story.voice_catalog`
  - Exposes voices from the configured TTS provider plus default voice.
- `mythoria.story.audio_status`
  - Supports story lookup by `storyId` or public `slug`.
  - Returns `audio_available` or `audio_unavailable` plus generation state (`not_started`, `generating`, `completed`, `failed`).
- `mythoria.story.audio_chapter`
  - Supports story lookup by `storyId` or public `slug`.
  - Returns private/public stream URLs per chapter when audio exists.
- `mythoria.story.narration_request`
  - Uses real credit checks (`audioBookGeneration`) and Pub/Sub queue publish.
  - Supports dry-run and explicit confirmation (`confirmStart`) before credit spend.
  - Supports `forceRegenerate` for replacing existing audio.
  - Returns a trackable Mythoria `jobId` for `mythoria.jobs.status`.

### Credits and eligibility notes

- `mythoria.credits.check_eligibility`
  - Action-level eligibility checks for:
    - `ebook`
    - `audiobook`
    - `print`
    - `story_generation` (feature mix)
  - Returns `eligible`, `requiredCredits`, `availableCredits`, `shortfall`, and pricing breakdown.
  - Includes policy guidance to avoid in-chat digital credit purchases.

### Story coaching notes

- `mythoria.coach.story_guidance`
  - Classifies requests into:
    - `product_info` (route to FAQ tools)
    - `story_creation_request` (route to draft/generation tools)
    - `creative_coaching` (return checklist/hints/opening example)
  - Provides localized guidance for supported locales.
  - Tool/result metadata binds this flow to `ui://mythoria/story-creation-v1.html`.

### Job tracking notes

- `mythoria.jobs.status`
  - Accepts a Mythoria `jobId` or `jobType + storyId`.
  - Returns normalized fields:
    - `state` (`queued`, `running`, `completed`, `failed`)
    - `progress`
    - `etaSeconds`
    - `lastUpdatedAt`
    - `failureCode`
    - `nextAction`
  - Uses existing story/print status signals as status sources.
- `mythoria.story.export_request` and `mythoria.story.print_request`
  - Return queued job descriptors and recommend follow-up with `mythoria.jobs.status`.
  - `mythoria.jobs.status` is widget-bound to `ui://mythoria/story-reader-v1.html`.

## Scope Mapping

- Mythoria MCP advertises Clerk-compatible scopes in protected-resource metadata.
- All authenticated MCP tools request the Clerk `profile` scope.
- Mixed-access reading/listening tools advertise `noauth` plus OAuth `profile`; `profile` is only required when the target story is private.
- Fine-grained authorization is enforced in Mythoria handlers through author identity, ownership checks, credit/billing checks, and explicit confirmation flags.

## Example call

```bash
curl -X POST https://mythoria.pt/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":"sample-1","method":"tools/call","params":{"name":"mythoria.discovery.sample_story_preview","arguments":{"locale":"en-US"}}}'
```

## E2E Testing

Run these checks in local dev (`npm run dev` running at `http://localhost:3000`):

```bash
npm run test:mcp:smoke
npm run test:e2e:mcp
```

Run authenticated MCP E2E coverage (optional bearer token):

```bash
MCP_E2E_BEARER_TOKEN=<token> npm run test:e2e:mcp:auth
```

Generate a bearer token with the local OAuth helper:

```bash
npm run auth:mcp:token
```

Notes:

- If `MCP_E2E_BEARER_TOKEN` is not provided, `test:e2e:mcp:auth` is skipped by design.
- `mythoria.help.search` expects argument `question` (not `query`).
- `auth:mcp:token` validates requested redirect URI and scopes against the configured Clerk OAuth client before opening the browser.
- Set `MCP_E2E_REDIRECT_URI` to a URI present in Clerk OAuth redirect allowlist (for local testing, `http://127.0.0.1:8799/callback`).
- If your Clerk OAuth client cannot mint `profile`, protected tools will return `insufficient_scope`; keep `MCP_AUTH_ALLOW_SESSION_TOKEN=true` in dev bridge mode or update the OAuth client scopes.

## Notes

- Backward compatibility with old tool names is intentionally removed.
- Discovery telemetry is currently app-log only (`[mcp-tool]` events); no DB writes.
- Story creation/library/reader-listener tools are now widget-bound via `_meta.ui.resourceUri`.
- Tool results for bound tools include `_meta.ui.resourceUri` + `openai/outputTemplate` for deterministic rendering.
- Story reading tools return compact text plus `structuredContent` with navigation pointers for follow-up turns.
- Story listening tools return structured generation and playback metadata (status, chapter URLs, provider voices).
- Tool `securitySchemes` and widget descriptor metadata are injected in `tools/list` at runtime due current MCP SDK limitations.
- Write/destructive tools include `openWorldHint` and/or `destructiveHint` metadata for submission safety.
- OAuth token fallback to Clerk `session_token` is available only if `MCP_AUTH_ALLOW_SESSION_TOKEN=true` (dev bridge mode).
