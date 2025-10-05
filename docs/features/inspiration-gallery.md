# Inspiration Gallery

## Mythoria's Take

When ideas run dry, the gallery is a portal of finished adventures waiting to spark the next. Filter by age band, illustration style, or language, skim ratings, and dive straight into a public preview. Each card is a promise that your story could earn the same spotlight.

## Technical Deep Dive

- Gallery surface: `src/app/[locale]/get-inspired/page.tsx` fetches `/api/stories/featured`, stores results in state, and filters client-side based on target audience, graphical style, and language selections.
- Filtering UI: the page builds checkbox arrays from translation-driven option lists, tracks active filters, and offers one-click resets while keeping counts in sync.
- Ratings and badges: average ratings plus counts appear when present, and metadata badges use translation keys (`GetInspiredPage.graphicalStyle.*`) to stay locale-aware.
- Media handling: cover art is loaded through Next Image with graceful fallbacks and hover animations for better visual storytelling.
- Navigation: each tile links to `/{locale}/p/{slug}` so visitors land directly on the public Reader experience.

```mermaid
flowchart LR
    FeaturedAPI[/api/stories/featured] --> Gallery
    Filters --> Gallery
    Gallery --> PublicStory[/p/{slug}]
```
