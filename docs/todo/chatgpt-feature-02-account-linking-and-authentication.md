# Feature 02 - Account Linking and Authentication

## Description

This feature provides a publishable authentication experience for Mythoria inside ChatGPT.

Goal:

- Anonymous users can still use safe public tools.
- Authenticated users can securely access private stories, credits, and account-specific actions.

It migrates from current ad-hoc Clerk bearer token assumptions to standards-compliant OAuth 2.1 for MCP.

## Workflow

1. User invokes an authenticated intent (for example: "show my stories").
2. ChatGPT receives tool auth requirements and shows account linking UI.
3. User authenticates and consents via OAuth provider.
4. ChatGPT stores token and calls Mythoria MCP tools with bearer token.
5. Mythoria verifies token (issuer, audience/resource, expiration, scopes).
6. Tool executes and returns user-scoped data.

Mixed-auth path:

- Public tools remain callable without sign-in.
- Auth-only tools enforce OAuth and return proper challenge metadata.

## Communication examples

1. User: "List my stories."
- Expected behavior: "Connect your Mythoria account" prompt appears when not linked.

2. User: "How do credits work on Mythoria?"
- Expected behavior: Public FAQ tools answer without login.

3. User: "Generate audiobook for my story <id>."
- Expected behavior: Requires linked account and explicit confirmation for write action.

## Dependencies

- Existing Clerk identity infrastructure.
- OAuth 2.1 protected resource metadata and discovery endpoints.
- MCP tool `securitySchemes` metadata and runtime auth errors.
- Feature 12 testing for auth flow and token failure cases.

## Development plan

1. Implement OAuth resource metadata endpoint:
- Publish `/.well-known/oauth-protected-resource`.
- Include resource URL, auth servers, and scopes.

2. Integrate authorization server metadata:
- Ensure PKCE `S256` support and dynamic client registration compatibility.
- Allow ChatGPT redirect URI and app-review redirect URI.

3. Add tool-level auth schemas:
- Declare `securitySchemes` for each tool.
- Keep mixed mode: `noauth` plus `oauth2` where appropriate.

4. Runtime auth behavior:
- Return `_meta["mcp/www_authenticate"]` for auth-required failures.
- Standardize 401/403 error payloads.

5. Acceptance criteria:
- Link flow succeeds for first-time users.
- Authenticated tools fail safely when tokens are invalid/expired.
- Public tools remain usable without linking.
