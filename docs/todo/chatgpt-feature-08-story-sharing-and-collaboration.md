# Feature 08 - Story Sharing and Collaboration

## Description

This feature brings sharing flows to ChatGPT for published stories.

It enables:

- Public link generation.
- Private view/edit share links.
- Link revocation and status checks.

Because sharing affects external visibility, this is a write-sensitive feature with clear confirmation requirements.

## Workflow

1. User requests to share a story.
2. Assistant verifies story selection and current visibility.
3. User chooses share mode:
- public
- private view
- private edit
4. Assistant confirms side effects.
5. App creates or updates share link.
6. Assistant returns link and explains validity/revocation options.

## Communication examples

1. User: "Share my story publicly."
- Assistant: confirms and returns `/p/{slug}` URL.

2. User: "Create a private edit link for 7 days."
- Assistant: creates tokenized link and returns access details.

3. User: "Revoke all share links for this story."
- Assistant: confirms destructive action, then revokes.

4. User: "Is this story currently public?"
- Assistant: returns visibility state and active links summary.

## Dependencies

- Existing share APIs under `/api/stories/{storyId}/share`.
- Existing private token gateway `/api/share/{token}`.
- Story ownership/collaborator authorization rules.
- Tool annotations for write/destructive actions.
- Feature 02 authenticated account linking.

## Development plan

1. Add MCP sharing tools:
- `stories.getShareState` (read-only)
- `stories.createShareLink` (write)
- `stories.revokeShareLink` (destructive/write)

2. Add explicit confirmation UX patterns:
- clear explanation before public exposure or revocation.

3. Add safe defaults:
- default private view-only with explicit override for public/edit modes.

4. Add policy checks:
- limit excessive link creation.
- enforce max expiration bounds.

5. Acceptance criteria:
- Sharing flows match web app behavior.
- All write/destructive actions require clear user intent.
- Revocation effects are immediate and verifiable.
