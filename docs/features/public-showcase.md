# Public Showcase & Ratings

## Mythoria's Take

Sharing a Mythoria tale is half the magic. Send a secret link to a friend, flip on public mode for the wider realm, and let readers rate their favorite chapters. If someone knocks while signed out, they still glimpse the cover and synopsis before being invited to join the circle. Fair feedback fuels better stories, and the showcase makes it effortless.

## Technical Deep Dive

- Public route: `src/app/[locale]/p/[slug]/page.tsx` resolves `/api/p/{slug}`, enriches metadata, renders `StoryReader`, and shows CTAs to print or craft a new story.
- Share tokens: `src/app/[locale]/s/[token]/page.tsx` calls `/api/share/{token}`, deciding whether to redirect, preview, or require authentication before revealing the full narrative.
- Rating widgets: `src/components/PublicStoryRating.tsx` fetches aggregated stats (`/api/stories/{id}/ratings`), captures user votes, supports optional feedback, and updates charts immediately.
- Access control: both pages respect `isPublic` flags, surface dedicated error states, and log analytics to `trackStoryManagement` when a story is viewed or shared.
- SEO scaffolding: metadata functions (Open Graph, hreflang) live in the blog/public routes to keep public stories discoverable without manual tweaks.

```mermaid
flowchart TD
    TokenLink[/s/{token}] --> ShareAPI[/api/share/{token}]
    ShareAPI -->|redirect| PublicSlug[p/{slug}]
    ShareAPI -->|preview| AuthPrompt
    PublicSlug --> Ratings[/api/stories/{id}/ratings]
    PublicSlug --> StoryReader
```
