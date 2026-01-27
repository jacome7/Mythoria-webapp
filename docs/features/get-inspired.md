# Get Inspired (Inspiration Gallery)

## Purpose

The **Get Inspired** page is a public-facing gallery of featured Mythoria stories. It helps visitors discover high-quality, shareable stories, filter by audience and style, and jump straight into the reader experience for a story they want to explore.

---

## End-User Experience

### Where to find it

- The navigation header links to **Get Inspired**.
- The page lives at `/{locale}/get-inspired` and is accessible without signing in.

### What the user sees

1. **Gallery header** with a title and subtitle.
2. **Filter panel** with three dropdowns:
   - **Target Audience** (age band)
   - **Art Style** (visual style)
   - **Language**
3. **Featured story cards** arranged in a responsive grid.
4. **Loading spinner** while stories are fetched.
5. **Empty state** messaging if no stories are available or no results match filters.

### How filtering works (user perspective)

- Users can select multiple values in each filter category.
- Selected filters show as badges with quick “✕” remove buttons.
- A “Clear Filters” action resets all selections.
- When filters are active, the page shows a count like “X of Y stories shown.”

### Story cards

Each story tile shows:

- Cover image (or a fallback image)
- Story title
- Author display name
- Optional rating summary (average + count)
- Metadata badges (audience, art style, language)
- **View Story** button that opens the public reader at `/{locale}/p/{slug}`

### Empty states

- **No featured stories**: encourages visitors to create a story.
- **Filters return zero results**: suggests clearing or adjusting filters.

---

## Developer Implementation

### Entry point and routing

- **UI page**: `src/app/[locale]/get-inspired/page.tsx` is a client component so it can fetch data and handle interactive filters on the client.
- **Public reader destination**: each card links to `/{locale}/p/{slug}`.
- **Navigation**: the header links to `/get-inspired` and locale routing prepends the active locale.

### Data flow

```mermaid
flowchart LR
  UI[Get Inspired page] -->|fetch| API[/api/stories/featured]
  API -->|storyService| DB[(Postgres)]
  UI -->|link| Reader[/p/{slug}]
```

1. The page fetches `/api/stories/featured` on mount.
2. Results are stored in local state as `featuredStories` and copied into `filteredStories`.
3. Filters are applied **client-side** by checking the selected arrays against each story.
4. Cards render from `filteredStories`.

### API contract

- **Route**: `src/app/api/stories/featured/route.ts`
- **Method**: `GET`
- **Optional query params**:
  - `targetAudience`
  - `graphicalStyle`
  - `storyLanguage`
- **Response**:
  ```json
  {
    "stories": [
      {
        "storyId": "uuid",
        "title": "...",
        "slug": "...",
        "featureImageUri": "https://...",
        "author": "Display Name",
        "createdAt": "...",
        "targetAudience": "children_7-10",
        "graphicalStyle": "watercolor",
        "storyLanguage": "en-US",
        "averageRating": 4.6,
        "ratingCount": 12
      }
    ]
  }
  ```

> **Note:** the UI currently calls the API without query parameters and filters client-side. If server-side filtering is desired for scale, update the client fetch to pass query params and remove or simplify the client filtering logic.

### Database and data selection

- **Story eligibility** (service query): only stories with `isPublic = true` and `isFeatured = true` are returned.
- **Core story fields** come from `stories` (title, slug, feature image, target audience, graphical style, language).
- **Author display name** is joined from `authors`.
- **Ratings** are aggregated from `story_ratings` using a subquery:
  - Average rating is rounded to one decimal.
  - Count of ratings is returned and used to decide if the rating UI should render.
- **Images** are normalized with `toAbsoluteImageUrl` so the UI can safely render the `featureImageUri`.

### UI behavior details

- The page defines **fixed option lists** for filters (`targetAudienceOptions`, `graphicalStyleOptions`, `storyLanguageOptions`). These options must stay aligned with:
  - database enums in `src/db/schema/enums.ts`
  - translation keys in `src/messages/*/GetInspiredPage.json`
- Rating stars render only when both `averageRating` and `ratingCount > 0` are present.
- `next/image` handles cover images and falls back to a Mythoria logo if the image fails to load.

### Localization and copy

- All UI text and filter labels come from `GetInspiredPage` translations:
  - Source of truth: `src/messages/en-US/GetInspiredPage.json`
  - Other locales: `src/messages/*/GetInspiredPage.json`
- The messages are loaded in `src/i18n/request.ts` and accessed via `useTranslations('GetInspiredPage')`.

### SEO and discovery

- Featured stories are added to the sitemap with locale-aware URLs, using `storyService.getFeaturedPublicStories()`.

---

## Extension & Maintenance Notes

- **Adding a new filter**: update the UI option array, API query parameter handling (if needed), translation keys, and the underlying enum/database values.
- **Changing available languages**: update `storyLanguageOptions` and the `storyLanguage` translation labels.
- **New card metadata**: ensure the field is exposed from `storyService.getFeaturedPublicStories()` and added to the API response, then render it in the UI.
- **Scaling the gallery**: move filtering to the API (query params already exist) and paginate results to avoid large client payloads.

---

## Key Files

- UI page: `src/app/[locale]/get-inspired/page.tsx`
- API route: `src/app/api/stories/featured/route.ts`
- Story query service: `src/db/services.ts` (`getFeaturedPublicStories`)
- Story schema: `src/db/schema/stories.ts`
- Rating schema: `src/db/schema/ratings.ts`
- Translations: `src/messages/*/GetInspiredPage.json`
- i18n loader: `src/i18n/request.ts`
- Sitemap: `src/app/sitemap.xml/route.ts`
