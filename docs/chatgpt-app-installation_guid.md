# Mythoria ChatGPT App - Installation and Production Deployment Guide

Date: 2026-02-11
Owner: Mythoria Web App Team
Applies to: Mythoria MCP server v0.9.0 (`src/lib/mcp/server.ts`)

## 1. Purpose

This guide describes how to configure, validate, submit, and publish the Mythoria ChatGPT App in the ChatGPT production environment, using the existing MCP server implementation.

## 2. Current Implementation Scope

The current production-ready scope already includes:

- Streamable HTTP MCP server at `https://mythoria.pt/api/mcp`
- OAuth protected resource metadata at `https://mythoria.pt/.well-known/oauth-protected-resource`
- Mixed auth model (`noauth` + OAuth 2.1), with per-tool `securitySchemes`
- Runtime OAuth challenges via `_meta["mcp/www_authenticate"]`
- Core tool families:
  - discovery/help/coaching
  - authenticated story creation and generation
  - story library and selection
  - story sharing and collaboration
  - credits eligibility guardrails
  - reading and listening
  - job status tracking
- MCP app widget resources (`text/html;profile=mcp-app`) for creation, library, and reader/listener surfaces

## 3. External Prerequisites

Before submitting to the ChatGPT Apps Directory:

1. OpenAI Platform organization is verified.
2. The submitter has `Owner` role in the OpenAI organization.
3. The MCP server is deployed on a public HTTPS domain (no localhost URLs).
4. Clerk OAuth setup supports:
   - metadata discovery
   - PKCE `S256`
   - a registered OAuth client with redirect allowlist and consent screen enabled
   - the standard Clerk scopes used by Mythoria MCP (`profile` for protected tool access)
5. Clerk OAuth redirect allowlist includes:
   - `https://chatgpt.com/connector_platform_oauth_redirect`
   - `https://platform.openai.com/apps-manage/oauth`
   - `http://127.0.0.1:8799/callback` (recommended for local OAuth token debugging)

References:

- `https://developers.openai.com/apps-sdk/build/auth/`
- `https://developers.openai.com/apps-sdk/deploy/submission/`
- `https://developers.openai.com/apps-sdk/app-submission-guidelines/`

## 4. Production Environment Configuration

Set and validate these values in production:

- `NEXT_PUBLIC_BASE_URL`
  - Must match the public app origin (example: `https://mythoria.pt`)
- `CLERK_SECRET_KEY`
  - Required for token verification in MCP tool calls
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Required for authorization-server resolution fallback
- `MCP_AUTHORIZATION_SERVER_URL`
  - Recommended explicit setting to Clerk authorization server base URL
- `MCP_RESOURCE_URL`
  - Optional override for MCP resource identifier (default is `<NEXT_PUBLIC_BASE_URL>/api/mcp`)
- `MCP_AUTH_ALLOW_SESSION_TOKEN`
  - Keep `false` (or unset) in production
- `MCP_WIDGET_DOMAIN`
  - Optional widget-domain override used in widget metadata

Validation command:

```bash
npm run check:env
```

## 5. Deploy Mythoria Web App + MCP Server

1. Run quality gates:

```bash
npm run lint
npm run typecheck
npm run test
```

2. Deploy production:

```bash
npm run deploy:production
```

3. Confirm middleware bypass for `/.well-known/*` remains active (`src/proxy.ts`).

## 6. Post-Deploy MCP Smoke Tests

Use MCP JSON-RPC payloads (not custom shorthand payloads):

1. OAuth protected-resource metadata:

```bash
curl -X GET https://mythoria.pt/.well-known/oauth-protected-resource
```

2. Ping tool:

```bash
curl -X POST https://mythoria.pt/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":"ping-1","method":"tools/call","params":{"name":"mythoria.discovery.ping","arguments":{}}}'
```

3. List tools (verify `securitySchemes` and widget metadata):

```bash
curl -X POST https://mythoria.pt/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":"tools-1","method":"tools/list","params":{}}'
```

4. List resources (verify `text/html;profile=mcp-app` resources):

```bash
curl -X POST https://mythoria.pt/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":"resources-1","method":"resources/list","params":{}}'
```

5. Run automated smoke + contract suites against dev/prod:

```bash
# local (with npm run dev running)
npm run test:mcp:smoke
npm run test:e2e:mcp

# authenticated MCP checks (optional)
MCP_E2E_BEARER_TOKEN=<token> npm run test:e2e:mcp:auth
```

Notes:

- If `MCP_E2E_BEARER_TOKEN` is missing, authenticated MCP E2E tests are skipped by design.
- `mythoria.help.search` input uses `question` (not `query`).
- For local token generation use `npm run auth:mcp:token`; it pre-validates redirect URI + scopes against Clerk OAuth app config.
- Configure `MCP_E2E_REDIRECT_URI=http://127.0.0.1:8799/callback` to match Clerk redirect allowlist.
- Protected MCP tools now advertise Clerk-compatible OAuth scopes and require `profile` for linked access.

## 7. Create the ChatGPT App (Draft)

In ChatGPT:

1. Enable Developer Mode:
   - `Settings -> Apps -> Advanced settings -> Developer mode`
2. Open Apps settings and click `Create app`.
3. Add the remote MCP server URL:
   - `https://mythoria.pt/api/mcp`
4. Save as draft, then open app details.
5. Refresh tools to import latest tool metadata.
6. Enable/disable tools per release strategy.

Reference:

- `https://platform.openai.com/docs/guides/developer-mode`

## 8. Validate Authentication and Mixed-Access Behavior

Run a manual linking test inside ChatGPT:

1. Call a noauth tool (`mythoria.discovery.capabilities`) and confirm it runs without linking.
2. Trigger an auth-required tool (`mythoria.account.story_list`) while unlinked.
3. Confirm ChatGPT shows account-linking UI.
4. Complete OAuth login and retry tool call.
5. Confirm auth-required tools now execute once ChatGPT receives a token with `profile`.
6. Confirm invalid/expired token behavior produces relink flow.

## 9. Submission Package Checklist

Before submitting in `https://platform.openai.com/apps-manage`:

1. App metadata
   - clear app name and description
   - screenshot set from real app flows
2. Policy and trust artifacts
   - privacy policy URL
   - support contact details
   - compliant commerce behavior (no digital credit sales inside app)
3. Reviewer access
   - working demo account credentials with sample data
4. Technical validation
   - OAuth redirects allowlisted
   - MCP endpoints publicly reachable
   - CSP and widget domain metadata correctly configured
   - golden prompt tests completed (direct, indirect, negative prompts)

Then:

1. Submit for review.
2. Address any reviewer feedback.
3. Publish after approval.

## 10. Known Gaps to Address Before Final Submission Hardening

These are non-blocking for MCP runtime, but important for review quality:

1. Feature 12 artifacts:
   - final submission-grade screenshot pack and reviewer runbook should be finalized per release

## 11. Ongoing Operations

- Replay discovery prompt set weekly (`docs/todo/chatgpt-discovery-manual-eval.md`)
- Track MCP logs (`[mcp-tool]` events) for latency and auth failures
- Re-submit app review for any tool name/signature/description changes
