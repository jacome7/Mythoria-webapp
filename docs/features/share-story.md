# Share Story

## Mythoria's Take

Sharing is a first-class story action: creators can generate private view/edit links or make a story public for anyone to read, then distribute that URL via WhatsApp, Facebook, email, or the native share sheet. Private links expire and can be revoked, while public links become part of the public story gallery experience.

## Technical Deep Dive

### Entry Points & UI

- **Story Library Console**: `src/components/MyStoriesTable.tsx` opens `ShareModal` when a published story is shared from the library table. The modal refreshes story data after a successful share to keep the public/private state in sync. 【F:src/components/MyStoriesTable.tsx†L31-L246】
- **Story Read + Listen experiences**: The read, listen, and chapter read pages wire share buttons to `ShareModal`, so the same sharing flow is available from the story player surfaces. 【F:src/app/[locale]/stories/read/[storyId]/page.tsx†L1-L290】【F:src/app/[locale]/stories/read/[storyId]/chapter/[chapterNumber]/page.tsx†L1-L232】【F:src/app/[locale]/stories/listen/[storyId]/page.tsx†L1-L826】
- **Share modal behavior**: `src/components/ShareModal.tsx` manages public vs. private sharing, optional edit access, link creation status, share buttons (WhatsApp/Facebook/email/native share), clipboard copy, and analytics tracking. It sends the create-share request to `/api/stories/{storyId}/share`. 【F:src/components/ShareModal.tsx†L1-L539】

### Share Link Creation API

- **Create public or private link**: `POST /api/stories/{storyId}/share` validates ownership/editor permission, then either:
  - Marks the story as public and ensures a unique slug for `/p/{slug}`.
  - Creates a private share link in `share_links` with `view` or `edit` access and a 30‑day expiration, returning `/s/{token}` (or `/s/{token}/edit`) in the response. 【F:src/app/api/stories/[storyId]/share/route.ts†L52-L194】
- **List active share links**: `GET /api/stories/{storyId}/share` returns non‑revoked, non‑expired links for the story (owner/editor only). 【F:src/app/api/stories/[storyId]/share/route.ts†L201-L286】
- **Revoke share links**: `DELETE /api/stories/{storyId}/share` can revoke a specific link or all links for the story. 【F:src/app/api/stories/[storyId]/share/route.ts†L288-L372】

### Share Link Access API

- **Token gatekeeper**: `GET /api/share/{token}` validates the token, rejects revoked/expired links, and:
  - Returns a preview payload (title, synopsis, cover, author) when authentication is required but missing.
  - Adds the requesting user as a `viewer` or `editor` collaborator when authenticated.
  - Redirects to `/stories/read/{storyId}` (with `?mode=edit` for edit links) when access is granted. 【F:src/app/api/share/[token]/route.ts†L1-L187】

### Shared Story Routes

- **Shared preview/redirect page**: `src/app/[locale]/s/[token]/page.tsx` calls `/api/share/{token}`. It redirects authorized users to the canonical reader route, or shows a preview + sign‑in prompt when authentication is required. 【F:src/app/[locale]/s/[token]/page.tsx†L1-L200】
- **Edit links**: `/s/{token}/edit` is a thin redirect that forwards to `/s/{token}`, letting the API handle edit access. 【F:src/app/[locale]/s/[token]/edit/page.tsx†L1-L31】

### Public Sharing Route

- **Public story page**: `/p/{slug}` fetches public story data via `/api/p/{slug}` and renders a full public reading experience. The page currently sets document metadata client‑side. 【F:src/app/[locale]/p/[slug]/page.tsx†L1-L190】
- **Public story API**: `GET /api/p/{slug}` verifies that the story is public, collects chapters and author details, and returns the payload used by the public reader. 【F:src/app/api/p/[slug]/route.ts†L1-L78】

### Data Model

- **Share links** live in the `share_links` table with `accessLevel`, `expiresAt`, and `revoked` fields; these power private share tokens. 【F:src/db/schema/stories.ts†L98-L150】
- **Collaborators** are tracked in `story_collaborators` with `viewer/editor` roles, which are added when shared links are accessed. 【F:src/db/schema/stories.ts†L152-L188】

```mermaid
flowchart LR
    UI[ShareModal] -->|POST| ShareAPI[/api/stories/{id}/share]
    ShareAPI -->|public| PublicLink[/p/{slug}]
    ShareAPI -->|private| PrivateLink[/s/{token}]
    PrivateLink --> AccessAPI[/api/share/{token}]
    AccessAPI -->|auth| Reader[/stories/read/{id}]
    AccessAPI -->|no auth| Preview[/s/{token} preview]
```
