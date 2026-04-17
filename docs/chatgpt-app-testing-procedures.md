# ChatGPT App Testing Procedures (Mythoria)

Date: 2026-02-12  
Applies to: local dev at `http://localhost:3000`, MCP endpoint `/api/mcp`, Clerk OAuth app `ChatGPT App`

## 1. Purpose

This guide provides two complete test procedures:

1. True OAuth manual loopback flow (local, browser-assisted token retrieval).
2. Full ChatGPT Developer Mode end-to-end test (account linking + tool execution).

## 2. Prerequisites

Before running either procedure:

1. Start web app dev server:

```powershell
npm run dev
```

2. Confirm environment values in `.env.local`:

- `NEXT_PUBLIC_BASE_URL=http://localhost:3000`
- `MCP_AUTHORIZATION_SERVER_URL=https://exciting-ibex-12.clerk.accounts.dev`
- `MCP_RESOURCE_URL=http://localhost:3000/api/mcp`
- `MCP_E2E_REDIRECT_URI=http://127.0.0.1:8799/callback`
- `MCP_E2E_SCOPE=profile email offline_access`
- `MCP_E2E_RESOURCE=http://localhost:3000/api/mcp`

3. Validate env parity:

```powershell
npm run check:env
```

4. Confirm Clerk OAuth app configuration:

- Redirect URIs include:
  - `http://127.0.0.1:8787/callback`
  - `http://127.0.0.1:8799/callback`
  - `https://chatgpt.com/connector_platform_oauth_redirect`
  - `https://platform.openai.com/apps-manage/oauth`
- App is `Public` and consent screen is enabled.

## 3. Procedure A: True OAuth Manual Loopback Flow

This procedure gets a real OAuth access token from Clerk using PKCE and a local callback server.

### Step A1: Verify local MCP OAuth metadata

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/.well-known/oauth-protected-resource" | ConvertTo-Json -Depth 8
```

Expected:

- `resource` is `http://localhost:3000/api/mcp`
- `authorization_servers` includes `https://exciting-ibex-12.clerk.accounts.dev`

### Step A2: Start OAuth token helper

```powershell
npm run auth:mcp:token
```

The script will:

1. Validate redirect URI against Clerk allowlist.
2. Validate requested scopes against Clerk OAuth app scopes.
3. Open browser to Clerk authorize URL.
4. Wait for callback at `http://127.0.0.1:8799/callback`.
5. Exchange code for access token.

### Step A3: Complete browser auth flow

In browser:

1. Sign in with test user.
2. Accept consent prompt (if shown).
3. Wait for success page (`Authentication successful`).

In terminal, copy exported command:

```powershell
$env:MCP_E2E_BEARER_TOKEN="<access_token>"
```

### Step A4: Run authenticated MCP tests

```powershell
npm run test:e2e:mcp:auth
```

### Step A5: Validate runtime logs

Check dev logs file and confirm `[mcp-tool]` events:

- successful auth flow should show `authState":"authenticated"` for protected tools.
- failures should show `invalid_token` or `insufficient_scope`.

### Step A6: Interpret results (important for current Clerk config)

Current Clerk OAuth app scopes are:

- `email offline_access profile`

Mythoria MCP now uses Clerk-compatible scopes for protected tools:

- protected tools require `profile`
- mixed-access reading/listening tools still work anonymously for public stories
- ownership, billing, and destructive-action checks remain enforced in Mythoria handlers

If true OAuth still fails with `insufficient_scope`, verify that the Clerk OAuth app is allowed to mint `profile`.

## 4. Procedure B: Full ChatGPT Developer Mode Test

This is the complete user-facing connector test (tool discovery + account linking + protected calls).

### Step B1: Expose MCP endpoint on public HTTPS URL

ChatGPT cannot use `localhost` directly. Use one of:

1. Deployed URL (recommended): `https://mythoria.pt/api/mcp`
2. HTTPS tunnel URL mapped to local `:3000` (for dev-only validation)

If using tunnel for local testing, ensure the MCP metadata and `NEXT_PUBLIC_BASE_URL` point to that public tunnel origin.

### Step B2: Validate OAuth metadata from public endpoint

```powershell
curl https://<public-origin>/.well-known/oauth-protected-resource
```

Expected:

- resource URL matches your public MCP endpoint.
- authorization server points to Clerk issuer.

### Step B3: Configure ChatGPT Developer Mode app

1. In ChatGPT: `Settings -> Apps -> Advanced settings -> Developer mode` (enable).
2. In `Settings -> Apps`, click `Create app`.
3. Enter MCP URL: `https://<public-origin>/api/mcp`.
4. Open app details and click refresh to import latest tools.

### Step B4: Execute end-to-end scenario matrix

1. Anonymous tool test:
   - Call `mythoria.discovery.capabilities`
   - Expect success without linking.
2. Linking trigger test:
   - Call `mythoria.account.story_list` while unlinked.
   - Expect ChatGPT linking UI.
3. OAuth completion test:
   - Complete Clerk login/consent.
   - Retry `mythoria.account.story_list`.
4. Protected-tool authorization test:
   - If token includes `profile`, expect success.
   - Otherwise expect `insufficient_scope` challenge naming `profile`.
5. Mixed-access behavior test:
   - Use reading/listening tools on public story (no link).
   - Use same tools on private story (link/scope required).
6. Token invalidation test:
   - Revoke/expire token and retry protected tool.
   - Expect relink flow with auth challenge.

### Step B5: Confirm server-side behavior

In server logs, verify:

1. `authState":"anonymous"` for public calls.
2. `authState":"authenticated"` after linking.
3. `_meta["mcp/www_authenticate"]` is returned on protected failures.

### Step B6: Capture evidence

Record:

1. ChatGPT app settings screenshot.
2. Link-flow screenshot.
3. Tool call JSON evidence (success and auth challenge).
4. Relevant `[mcp-tool]` log excerpts.

## 5. Recommended Testing Modes

Use all three for confidence:

1. True OAuth loopback (`npm run auth:mcp:token`) for OAuth protocol validation.
2. ChatGPT Developer Mode for real user journey validation.
3. Dev automation bridge (`MCP_AUTH_ALLOW_SESSION_TOKEN=true`) for fast CI-style protected tool regression tests.

## 6. Troubleshooting

1. `Redirect URI is not allowed`
   - Add the exact callback URI to Clerk OAuth app redirects.
2. `MCP_E2E_BEARER_TOKEN not provided`
   - Export token to env before running `test:e2e:mcp:auth`.
3. `insufficient_scope`
   - OAuth token lacks the advertised protected-tool scope (`profile`).
   - In `test:e2e:mcp:auth`, scope-limited OAuth tokens now skip privileged checks with an explicit reason instead of failing generic `isError` assertions.
4. ChatGPT does not show linking UI
   - Check tool `securitySchemes` and `_meta["mcp/www_authenticate"]` in error result.
5. OAuth callback timeout in token helper
   - Confirm browser completed flow and local callback port (`8799`) is reachable.
