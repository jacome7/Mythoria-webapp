# Story Library Console

## Mythoria's Take

This is the command bridge where every tale you craft parks between voyages. Scan the table, sort by mood, peek at live generation progress, and jump into reading, editing, or listening with one tap. Need to share with the cousins, order a print, or spin a clone for a birthday remix? The console has the switches. It even lets you keep an eye on your credit stash so you never run out of pixie dust mid-adventure.

## Technical Deep Dive

- Dashboard shell: `src/app/[locale]/my-stories/page.tsx` authenticates with Clerk, fetches author data (`/api/auth/me`) and credit balances (`/api/my-credits`), and renders tabbed views for stories and characters.
- Stories table: `src/components/MyStoriesTable.tsx` relies on `useStoriesTable` for pagination and sorting, exposing action handlers for delete, share, print, duplicate, and edit.
- Action menu: `src/components/my-stories/StoryRow.tsx` handles responsive menus, status badges (including generation progress), and deep links to read (`/stories/read/{id}`), listen, print, or edit routes.
- Share tooling: `src/components/ShareModal.tsx` creates private or public links via `/api/stories/{id}/share`, toggles edit rights, surfaces WhatsApp, Facebook, email, and native share integrations, and logs events with `trackStoryManagement`.
- Duplication and deletion: API calls to `/api/my-stories/{id}` (POST for duplication, DELETE for removal) update local state and show toast feedback via `useToast` and `ToastContainer`.
- Credit awareness: `src/components/CreditsDisplay.tsx` opens a modal history sourced from `/api/my-credits`, displaying transactions and linking to the buy-credits flow.

```mermaid
flowchart LR
    Stories[MyStoriesTable] -->|fetch| API[/api/my-stories]
    Stories --> ShareModal
    Stories --> Print
    Stories --> Duplicate
    ShareModal -->|POST| ShareAPI[/api/stories/{id}/share]
    Duplicate -->|POST| DuplicateAPI[/api/my-stories/{id}]
    Delete -->|DELETE| DeleteAPI[/api/my-stories/{id}]
```
