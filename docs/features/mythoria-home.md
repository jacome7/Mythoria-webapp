# Mythoria Home Experience

## Mythoria's Take

The landing page is a stage-set montage: the typewriter headline keeps riffing new genres, sample books tease every audience, and the step-by-step timeline explains how the journey works before you even log in. Scroll a little further for the quote of the day and the live counter tallying how many stories Mythorians have already launched. It is the hype reel your imagination deserves.

## Technical Deep Dive

- Hero band: `src/app/[locale]/page.tsx` uses `TypeAnimation` to cycle translated keywords, displays CTA buttons, and includes signed-out CTAs via Clerk `SignedOut` guard.
- Sample library: the same file showcases public slugs via static links, responsive cards, and localized alt text.
- How-it-works timeline: DaisyUI timeline classes pull copy from `HomePage.howItWorks.*` translations to stay locale-friendly.
- Quote widget: `src/components/QuoteOfTheDay.tsx` selects a deterministic quote based on the day-of-year and renders animated cards.
- Story metric: `src/components/StoryCounter.tsx` polls `/api/stories?action=count`, applies a transformation for display, and updates the UI with DaisyUI stats while handling errors gracefully.
- CTA footer: the page wraps with SignedOut-only prompts nudging visitors to create an account.

```mermaid
flowchart TD
    HomePage --> QuoteOfDay
    HomePage --> StoryCounter
    StoryCounter -->|GET| StoriesAPI[/api/stories?action=count]
```
