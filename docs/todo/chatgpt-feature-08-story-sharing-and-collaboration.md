# Feature 08 - Story Sharing and Collaboration

Status: Implemented (core MCP scope, 2026-02-11)

## Description

Story sharing flows are now available in MCP, including public visibility status, private link creation, and revocation.

Implemented MCP tools:

- `mythoria.story.share_state` (read-only, OAuth scope `mythoria.account.read`)
- `mythoria.story.share_create_link` (write, OAuth scope `mythoria.story.write`)
- `mythoria.story.share_revoke_link` (destructive/write, OAuth scope `mythoria.story.write`)

## Implemented behavior

1. Share state:

- Returns story visibility (`isPublic`, `slug`, public URL when available).
- Returns active private links, with optional inclusion of revoked/expired links.

2. Share link creation:

- Supports `mode`:
  - `public`
  - `private_view`
  - `private_edit`
- Defaults to private view sharing.
- Supports `expiresInDays` for private links (1-365, default 30).
- Requires explicit `confirmPublicExposure=true` before enabling public visibility.

3. Share revocation:

- Supports single-link revocation (`linkId`) or bulk revocation (`revokeAll=true`).
- Supports disabling public visibility (`disablePublic=true`).
- Requires explicit `confirmRevoke=true` before destructive operations.

## Safety and metadata

- Write tools are annotated with `readOnlyHint: false`.
- Revocation tool is annotated with `destructiveHint: true`.
- Sharing write tools include `openWorldHint: true`.
- Tool metadata includes MCP app widget binding (`ui://mythoria/story-library-v1.html`).

## Notes

- Tool implementation reuses existing story/share data model behavior.
- Public URLs are generated as `/{locale}/p/{slug}` and private links as `/s/{token}` or `/s/{token}/edit`.
