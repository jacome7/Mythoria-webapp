# Story Sharing

## Overview

Story sharing enables creators to distribute their stories through two distinct mechanisms:

1. **Public sharing**: Stories become accessible to anyone via a human-readable URL slug (`/p/{slug}`)
2. **Private sharing**: Time-limited access tokens with configurable permissions (`/s/{token}`)

Both methods support rich social media previews (Open Graph metadata) and provide seamless authentication flows for private access.

---

## User Guide

### How to Share a Story

Users can initiate story sharing from three locations:

- **My Stories page**: Click the share icon on any published story in the library table
- **Story reader**: Access the share button while reading a story (`/stories/read/{storyId}`)
- **Story listener**: Share from the audiobook player interface (`/stories/listen/{storyId}`)

All entry points open the same **Share Modal** dialog with consistent options.

### Sharing Options

#### Public Sharing

**What it does**: Makes the story accessible to anyone on the internet without authentication.

**How it works**:

1. Toggle "Make story public" in the Share Modal
2. Click "Generate Share Link"
3. System generates a unique URL slug based on the story title (e.g., `/p/the-dragons-quest`)
4. Share the URL via WhatsApp, Facebook, email, or native device share sheet

**Visibility**: Public stories appear in search results and can be indexed by search engines.

**URL format**: `https://mythoria.pt/{locale}/p/{slug}`

#### Private Sharing (View-Only)

**What it does**: Creates a temporary link that grants read-only access to authenticated users.

**How it works**:

1. Ensure "Make story public" is **unchecked** and "Allow recipient to edit" is **unchecked**
2. Click "Generate Share Link"
3. System creates a unique token with 30-day expiration (e.g., `/s/a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8`)
4. Recipients must sign in or create an account to access the story
5. After authentication, they're added as "viewer" collaborators

**Expiration**: Links expire after 30 days or when manually revoked.

**URL format**: `https://mythoria.pt/{locale}/s/{token}`

#### Private Sharing (Edit Access)

**What it does**: Creates a temporary link that grants collaborative editing permissions.

**How it works**:

1. Toggle "Allow recipient to edit"
2. Click "Generate Share Link"
3. System creates a token that adds authenticated users as "editor" collaborators
4. Editors can modify story content, chapters, and settings

**Expiration**: Links expire after 30 days or when manually revoked.

**URL format**: `https://mythoria.pt/{locale}/s/{token}/edit` (redirects to `/s/{token}`)

### Revoking Access

- **Public stories**: Uncheck "Make story public" and regenerate to remove public access
- **Private links**: Use the DELETE endpoint `/api/stories/{storyId}/share?linkId={token}` or `?revokeAll=true`

### Rating and Feedback on Public Stories

Public story pages include a rating widget and a feedback form that lets readers share private notes with the author.

#### Rating a Story

**Where it appears**: On public story pages and public chapter pages (`/[locale]/p/[slug]` and `/[locale]/p/[slug]/chapter/[chapterNumber]`).

**How it works**:

1. Readers select a star rating from 1 to 5.
2. Ratings of **4–5 stars** submit immediately.
3. Ratings of **1–3 stars** open a short feedback form where readers can optionally explain what needs improvement.
4. Readers can choose to let the author see their name (if signed in).

**Anonymous vs. named feedback**:

- If the reader is **not signed in**, the rating is stored anonymously.
- If signed in, the reader can opt to include their name alongside feedback.

#### Sending a Comment to the Author

Readers can send a private message to the author from the same rating card.

**Requirements**:

- Must be signed in.
- Subject must be 3–80 characters.
- Message must be 10–800 characters.

**What happens**:

- The message is sent to the Story Generation Workflow service and delivered to the author.
- The message is **not** publicly visible and does not appear on the public story page.

---

## Developer Guide

### Architecture Overview

Story sharing consists of four primary components:

1. **UI Layer**: `ShareModal.tsx` component
2. **Share Management API**: `/api/stories/{storyId}/share` (POST/GET/DELETE)
3. **Access Gateway API**: `/api/share/{token}` (GET)
4. **Public Story API**: `/api/p/{slug}` (GET)
5. **Frontend Routes**:
   - `/[locale]/p/[slug]` for public stories
   - `/[locale]/s/[token]` for private access

Public story pages also include **ratings and author feedback** as a related public-sharing surface:

6. **Rating UI**: `PublicStoryRating.tsx`
7. **Ratings API**: `/api/stories/{storyId}/ratings` (GET/POST)
8. **Author Feedback API**: `/api/stories/{storyId}/feedback` (POST)

### Data Model

#### Database Schema

**stories table** (sharing-relevant fields):

```typescript
{
  slug: text('slug'),              // Human-readable public URL identifier
  isPublic: boolean('is_public'),  // Public access flag
  isFeatured: boolean,             // Gallery feature flag
  // ... other story fields
}
```

**share_links table**:

```typescript
{
  id: uuid (PK),                  // Token used in /s/{token} URLs
  storyId: uuid (FK → stories),   // Story reference
  accessLevel: enum('view'|'edit'), // Permission level
  expiresAt: timestamp,           // 30-day expiration
  revoked: boolean,               // Manual revocation flag
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**story_collaborators table**:

```typescript
{
  storyId: uuid (FK → stories),   // Story reference
  userId: uuid (FK → authors),    // Collaborator reference
  role: enum('viewer'|'editor'),  // Access role
  createdAt: timestamp
}
// Composite PK: (storyId, userId)
```

**story_ratings table**:

```typescript
{
  ratingId: uuid (PK),                 // Rating identifier
  storyId: uuid (FK → stories),        // Story reference
  userId: uuid (FK → authors) | null,  // Optional for anonymous ratings
  rating: enum('1'|'2'|'3'|'4'|'5'),   // Star rating
  feedback: text | null,               // Optional comment
  isAnonymous: boolean,                // Whether name is hidden
  includeNameInFeedback: boolean,      // Explicit opt-in for name display
  createdAt: timestamp
}
```

#### Indexes

Performance optimizations:

- `share_links_story_id_idx` on `storyId`
- `share_links_expires_at_idx` on `expiresAt`
- `share_links_revoked_idx` on `revoked`
- `story_collaborators_user_id_idx` on `userId`
- `stories_slug_idx` on `slug` (partial index where slug IS NOT NULL)
- `stories_is_public_idx` on `isPublic` (partial index where isPublic = true)

### Component Implementation

#### ShareModal (`src/components/ShareModal.tsx`)

**Props interface**:

```typescript
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  storyTitle: string;
  isPublic?: boolean;
  slug?: string;
  onShareSuccess?: (shareData: ShareData) => void;
}
```

**State management**:

- `allowEdit`: Toggle for edit vs. view permissions
- `makePublic`: Toggle for public vs. private sharing
- `shareData`: Response from share API (URL, token, expiration)
- `copied`: Clipboard copy feedback state

**Key behaviors**:

1. Validates `storyId` is not undefined/null before API calls
2. Tracks sharing analytics via `trackStoryManagement.shared()`
3. Provides social sharing integrations (WhatsApp, Facebook, Email)
4. Falls back to clipboard copy when native share API unavailable
5. Resets form state on modal close

**Translations**: `ShareModal.json` (26 keys across 5 locales)

#### PublicStoryRating (`src/components/PublicStoryRating.tsx`)

**Purpose**: Collect star ratings and optional feedback for public stories, plus private comments to authors.

**Props interface**:

```typescript
interface PublicStoryRatingProps {
  storyId: string;
  onRatingSubmitted?: (rating: number) => void;
}
```

**State highlights**:

- `ratingData`: Average rating, distribution, and current user’s rating
- `showFeedbackForm`: Opens for ratings 1–3
- `includeNameInFeedback`: Opt-in for showing the author’s name
- `authorSubject` / `authorMessage`: Inputs for feedback to author

**Key behaviors**:

1. Fetches rating stats and the current user’s rating from `/api/stories/{storyId}/ratings`.
2. Submits ratings to `/api/stories/{storyId}/ratings` (supports anonymous submissions).
3. Opens a feedback form for low ratings (1–3 stars).
4. Sends a private message to the author via `/api/stories/{storyId}/feedback` (sign-in required).
5. Refreshes rating statistics after submission.

**Where it renders**:

- Public story page and public chapter pages (`/[locale]/p/[slug]` and `/[locale]/p/[slug]/chapter/[chapterNumber]`).

**Translations**: `StoryRating.json` (localized across 5 locales).

### API Endpoints

#### POST `/api/stories/{storyId}/share`

**Purpose**: Create public or private share links

**Authorization**:

- Requires authenticated user (`auth().userId`)
- User must be story owner OR editor collaborator

**Request body**:

```typescript
{
  allowEdit?: boolean,     // Default: false (view-only)
  makePublic?: boolean,    // Default: false (private)
  expiresInDays?: number   // Default: 30 (private links only)
}
```

**Response scenarios**:

_Public sharing_ (`makePublic: true`):

```typescript
{
  success: true,
  linkType: 'public',
  url: '/p/{slug}',
  message: 'Public accessible'
}
```

- Generates slug from story title using `generateSlug()` and `ensureUniqueSlug()`
- Updates `stories.isPublic = true` and `stories.slug = {slug}`

_Making private_ (`makePublic: false` when previously public):

```typescript
{
  success: true,
  linkType: 'private',
  url: '',
  message: 'Now private'
}
```

- Sets `stories.isPublic = false`

_Private link creation_:

```typescript
{
  success: true,
  linkType: 'private',
  url: '/s/{token}' or '/s/{token}/edit',
  token: '{uuid}',
  accessLevel: 'view' | 'edit',
  expiresAt: '2026-02-25T12:00:00Z',
  message: 'Private {view|edit} link created'
}
```

- Inserts row into `share_links` table with 30-day expiration
- Returns edit URL format if `allowEdit: true`

**Error responses**:

- `401`: Unauthorized (no userId)
- `400`: Invalid storyId
- `404`: Story not found or user lacks permissions
- `500`: Database/server error

#### GET `/api/stories/{storyId}/share`

**Purpose**: List all active private share links for a story

**Authorization**: Owner or editor collaborator only

**Query filters**: Automatically excludes revoked and expired links

**Response**:

```typescript
{
  success: true,
  shareLinks: [
    {
      id: string,
      storyId: string,
      accessLevel: 'view' | 'edit',
      expiresAt: string,
      revoked: boolean,
      createdAt: string,
      updatedAt: string
    }
  ]
}
```

#### DELETE `/api/stories/{storyId}/share`

**Purpose**: Revoke share links

**Authorization**: Owner or editor collaborator only

**Query parameters**:

- `linkId={uuid}`: Revoke specific link
- `revokeAll=true`: Revoke all links for the story

**Response**:

```typescript
{
  success: true,
  message: 'Share link revoked' | 'All share links revoked'
}
```

**Implementation**: Sets `share_links.revoked = true` and updates `updatedAt`

#### GET `/api/share/{token}`

**Purpose**: Validate private share token and grant access

**Authentication**: Optional (required for view/edit access)

**Response scenarios**:

_Expired/revoked token_:

```typescript
// Status: 410 Gone
{
  error: 'Share link has expired or been revoked';
}
```

_Valid token, unauthenticated user_:

```typescript
// Status: 401 Unauthorized
{
  success: false,
  requiresAuth: true,
  storyPreview: {
    title: string,
    synopsis: string,
    authorName: string,
    coverUri?: string,
    targetAudience?: string,
    graphicalStyle?: string
  },
  accessLevel: 'view' | 'edit'
}
```

_Valid token, authenticated user_:

```typescript
// Status: 200 OK
{
  success: true,
  story: { /* full story object */ },
  author: { displayName: string },
  accessLevel: 'view' | 'edit',
  redirectUrl: '/stories/read/{storyId}' | '/stories/read/{storyId}?mode=edit'
}
```

**Side effects** (authenticated access):

1. Creates author record if user doesn't exist (`authorService.syncUserOnSignIn()`)
2. Adds user to `story_collaborators` as viewer or editor
3. Skips collaborator creation if user already has equal/higher permissions

**Security considerations**:

- Tokens are UUIDs (128-bit entropy, unpredictable)
- Expiration checked on every access attempt
- Revoked flag prevents reuse even if token known
- Author creation uses Clerk's user data to prevent spoofing

#### GET `/api/p/{slug}`

**Purpose**: Fetch public story data by slug

**Authorization**: None required

**Validation**: Returns 403 if `stories.isPublic = false`

**Response**:

```typescript
{
  success: true,
  story: {
    storyId: string,
    title: string,
    authorName: string,  // Uses customAuthor || author.displayName
    dedicationMessage?: string,
    targetAudience?: string,
    graphicalStyle?: string,
    coverUri?: string,
    backcoverUri?: string,
    synopsis?: string,
    createdAt: string,
    isPublic: true,
    slug: string,
    hasAudio: boolean,
    audiobookUri?: object
  },
  chapters: Chapter[],
  accessLevel: 'public'
}
```

#### POST `/api/stories/{storyId}/ratings`

**Purpose**: Create or update a rating for a story.

**Authentication**: Optional.

**Request body**:

```typescript
{
  rating: '1' | '2' | '3' | '4' | '5',
  feedback?: string | null,
  includeNameInFeedback?: boolean
}
```

**Behavior**:

- If the user is authenticated and already rated, the existing rating is updated.
- If unauthenticated, the rating is stored anonymously.
- `isAnonymous` is set when the user is not signed in or doesn’t opt-in to include their name.

**Responses**:

- `200`: Rating created or updated.
- `400`: Missing story ID or invalid rating.
- `404`: Story not found.
- `503`: Rating table not yet available (migration not applied).

#### GET `/api/stories/{storyId}/ratings`

**Purpose**: Fetch rating statistics and the current user’s rating.

**Authentication**: Optional.

**Response**:

```typescript
{
  totalRatings: number,
  averageRating: number,
  ratingDistribution: { 5: number; 4: number; 3: number; 2: number; 1: number },
  ratings: Array<{
    ratingId: string,
    rating: string,
    feedback: string | null,
    isAnonymous: boolean,
    includeNameInFeedback: boolean,
    authorName: string | null,
    createdAt: string
  }>,
  userRating: {
    ratingId: string,
    rating: string,
    feedback: string | null,
    createdAt: string
  } | null
}
```

**Privacy**:

- Author names are included only when `includeNameInFeedback` is true and `isAnonymous` is false.

#### POST `/api/stories/{storyId}/feedback`

**Purpose**: Send a private comment to the story author.

**Authentication**: Required (`getCurrentAuthor()` must succeed).

**Request body**:

```typescript
{
  subject: string, // 3–80 characters
  message: string  // 10–800 characters
}
```

**Authorization rules**:

- The story must be public **or** the requester must be the owner.

**Delivery**:

- Forwards the feedback to Story Generation Workflow via `/api/story-feedback`.

**Error cases**:

- `401`: Not authenticated.
- `403`: Story is private and user is not the owner.
- `404`: Story not found.

### Frontend Routes

#### `/[locale]/p/[slug]` - Public Story Page

**File**: `src/app/[locale]/p/[slug]/page.tsx`

**Features**:

- Server-side metadata generation with `generateMetadata()`
- Open Graph tags with story cover, title, synopsis
- Twitter Card support
- Falls back to Mythoria branding if story not found
- Renders client component `PublicStoryPageClient`

**Client component** (`PublicStoryPageClient.tsx`):

- Fetches story data from `/api/p/{slug}`
- Displays full chapter content
- Audio player if available
- Social sharing buttons

**Metadata example**:

```typescript
{
  title: "Mythoria | The Dragon's Quest",
  description: "A young hero embarks on a magical journey...",
  openGraph: {
    title: "Mythoria | The Dragon's Quest",
    url: "https://mythoria.pt/en-US/p/the-dragons-quest",
    type: "article",
    images: [{ url: "...", width: 1200, height: 630 }]
  }
}
```

#### `/[locale]/s/[token]` - Private Share Access Page

**File**: `src/app/[locale]/s/[token]/page.tsx`

**Features**:

- Server-side metadata with preview from `share_links` + `stories`
- Handles expired/revoked links with fallback metadata
- Renders client component `SharedStoryPageClient`

**Client component** (`SharedStoryPageClient.tsx`):

**Flow**:

1. Calls `/api/share/{token}` on mount
2. **If authenticated & valid**: Redirects to `/stories/read/{storyId}` (or `/stories/read/{storyId}?mode=edit`)
3. **If unauthenticated**: Displays story preview with sign-in/sign-up CTAs

**Preview UI** (unauthenticated):

- Story title, cover image, synopsis
- Author attribution
- Access level indicator (view vs. edit)
- Sign-in button with redirect parameter: `/sign-in?redirect=/s/{token}`
- Sign-up button with redirect parameter: `/sign-up?redirect=/s/{token}`
- Mythoria branding footer

**Translations**: `SharedStoryPage.json` (8 keys)

#### `/[locale]/s/[token]/edit` - Edit Access Shortcut

**File**: `src/app/[locale]/s/[token]/edit/page.tsx`

**Purpose**: Alias route for edit links

**Implementation**: Server-side redirect to `/[locale]/s/[token]`

- API handles edit vs. view logic based on token's `accessLevel`

### Authorization Logic

#### Story Access Control (`src/lib/authorization.ts`)

**Function**: `ensureStoryIdAccess(storyId, requesterAuthorId)`

**Purpose**: Validates ID-based story access (not public routes)

**Rules**:

1. User is story owner (`story.authorId === requesterAuthorId`)
2. OR user is collaborator (viewer/editor role in `story_collaborators`)
3. Public status does NOT grant ID-based access

**Throws**: `AccessDeniedError` if access denied or story doesn't exist (obscures existence for security)

**Usage**: Called by story editing, deletion, and management endpoints

### Security Considerations

#### Authentication & Authorization

**Public stories** (`/p/{slug}`):

- No authentication required
- Database query validates `isPublic = true`
- Prevents enumeration attacks (404 vs. 403 leaks no info)

**Private tokens** (`/s/{token}`):

- UUID tokens provide ~2^122 bits of entropy (unpredictable)
- Expiration enforced on every access (30 days default)
- Revocation flag enables instant access termination
- Token validation happens before revealing story existence

**Collaborator creation**:

- Uses Clerk authentication to prevent identity spoofing
- `authorService.syncUserOnSignIn()` ensures consistent user records
- Existing collaborators with higher permissions aren't downgraded

#### Data Exposure

**Preview mode** (unauthenticated `/s/{token}` access):

- Intentionally exposes: title, synopsis, cover, author name, target audience, graphical style
- Does NOT expose: full chapters, edit history, generation metadata

**Slug generation**:

- `generateSlug()` creates URL-safe strings from titles
- `ensureUniqueSlug()` prevents collisions by appending incremental suffixes

**Error messages**:

- Generic responses prevent information leakage
- "Story not found" used for both nonexistent stories and unauthorized access
- 410 Gone for expired links (standard HTTP semantics)

#### Ratings & Feedback Security

**Anonymous ratings**:

- Ratings can be submitted without authentication.
- When unauthenticated, the rating is stored without a user ID and is always anonymous.

**Named feedback**:

- Names are shown only when the user is authenticated **and** explicitly opts in to share their name.
- The API never exposes names for anonymous ratings.

**Author feedback access**:

- Sending feedback requires authentication.
- The story must be public or belong to the authenticated author.

#### Rate Limiting & Abuse Prevention

**Current implementation**: None (TODO item)

**Recommended safeguards**:

- Rate limit share link creation per user (e.g., 100/hour)
- Rate limit token validation attempts (e.g., 10/minute per IP)
- Monitor for automated scraping of public slugs

### Integration Points

#### Analytics Tracking

**Location**: `ShareModal.tsx` line ~107-113

**Event**: `trackStoryManagement.shared()`

**Payload**:

```typescript
{
  story_id: string,
  story_title: string,
  share_type: 'public' | 'private',
  allow_edit: boolean,
  expires_in_days: number
}
```

#### Social Media Integration

**Platforms**:

- **WhatsApp**: `wa.me` API with pre-filled message
- **Facebook**: Share Dialog API (requires Facebook App ID configuration)
- **Email**: `mailto:` links with subject and body
- **Native Share**: Web Share API with fallback to clipboard copy

**Message templates**: Defined in `ShareModal.json` translations

#### Slug Generation Utilities

**Location**: `src/lib/slug.ts`

**Functions**:

- `generateSlug(title: string)`: Converts title to URL-safe format
  - Lowercases text
  - Replaces spaces with hyphens
  - Removes special characters
  - Truncates to reasonable length
- `ensureUniqueSlug(baseSlug: string, checkExists: (slug) => Promise<boolean>)`: Appends `-2`, `-3`, etc. until unique

### Testing Considerations

**Unit tests** should cover:

- Share link creation with various permission combinations
- Token expiration validation
- Revocation logic
- Slug uniqueness collision handling
- Authorization rules (owner, editor, viewer)
- Rating validation and update logic (1–5 bounds, existing rating updates)
- Anonymous vs. named feedback handling
- Author feedback subject/message validation

**Integration tests** should verify:

- Complete share-to-access flow for private links
- Public story discoverability
- Unauthenticated preview display
- Post-authentication redirection
- Collaborator role assignment
- Ratings GET returns aggregates and user-specific rating
- Feedback-to-author call enforces authentication and story visibility

**E2E tests** should validate:

- Share modal UI interactions
- Social media sharing buttons
- Copy-to-clipboard functionality
- Sign-in redirect flow from shared links
- Expired link error states
- Public story rating submission flows (1–3 with feedback, 4–5 direct)
- Author feedback sign-in gating and success confirmation

### Common Issues & Debugging

**Issue**: Share link returns 404

- **Check**: Token hasn't expired (`expiresAt > NOW()`)
- **Check**: Token not revoked (`revoked = false`)
- **Check**: Database query using correct `share_links.id` value

**Issue**: User can't access shared story after sign-in

- **Check**: Author record created successfully in `authors` table
- **Check**: Collaborator row inserted into `story_collaborators`
- **Check**: `ensureStoryIdAccess()` includes collaborator logic

**Issue**: Public slug returns 403

- **Check**: `stories.isPublic = true` in database
- **Check**: Slug matches exactly (case-sensitive)

**Issue**: Rating submit returns 503

- **Check**: Migration for `story_ratings` table applied
- **Check**: Database connectivity for ratings service

**Issue**: Author feedback fails to send

- **Check**: User is authenticated and has an author record
- **Check**: Story is public or owned by the sender
- **Check**: SGW `/api/story-feedback` response status

**Issue**: Duplicate slugs created

- **Check**: `ensureUniqueSlug()` called before inserting
- **Check**: Race condition in concurrent share requests (add unique constraint)

### Future Enhancements

**Potential improvements**:

1. **Granular permissions**: Chapter-level view/edit controls
2. **Custom expiration**: User-configurable link lifespans
3. **Link analytics**: Track views, unique visitors per share link
4. **Password protection**: Optional password layer for private links
5. **Embed codes**: iFrame embeds for public stories
6. **Download tracking**: Monitor PDF/ebook download counts
7. **Collaborative editing UI**: Real-time multi-user editor
8. **Share link dashboard**: Centralized management for all links
9. **Notification**: Email alerts when someone accesses shared story
10. **Access revocation history**: Audit log of permission changes

---

## Translations

All user-facing strings must exist in 5 locales:

**Files**:

- `src/messages/en-US/ShareModal.json` (26 keys)
- `src/messages/en-US/SharedStoryPage.json` (8 keys)
- `src/messages/en-US/StoryRating.json` (42 keys)
- Plus equivalents in `pt-PT`, `es-ES`, `fr-FR`, `de-DE`

**Key namespaces**:

- `ShareModal.*`: Share modal UI strings
- `SharedStoryPage.*`: Private share access page strings
- `StoryRating.*`: Public story ratings and feedback UI
- `StoryReader.*`: Reader UI shared with sharing features
- `Auth.*`: Authentication prompts in share flows
- `Actions.*`: Generic action buttons (Try Again, Go Home)

**Adding new strings**:

1. Add to `en-US` JSON files
2. Propagate structure to all 4 other locales
3. Run `npm run i18n:keys` to regenerate types
4. Run `npm run i18n:parity` to validate alignment

---

## File Reference

### Core Implementation Files

**UI Components**:

- `src/components/ShareModal.tsx` - Primary sharing interface (534 lines)
- `src/components/PublicStoryRating.tsx` - Ratings + author feedback widget (512 lines)
- `src/app/[locale]/s/[token]/SharedStoryPageClient.tsx` - Private share preview (215 lines)
- `src/app/[locale]/p/[slug]/PublicStoryPageClient.tsx` - Public story reader

**API Routes**:

- `src/app/api/stories/[storyId]/share/route.ts` - Share management (369 lines)
- `src/app/api/stories/[storyId]/ratings/route.ts` - Ratings read/write (223 lines)
- `src/app/api/stories/[storyId]/feedback/route.ts` - Author feedback relay (90 lines)
- `src/app/api/share/[token]/route.ts` - Token validation & access grant (191 lines)
- `src/app/api/p/[slug]/route.ts` - Public story data (78 lines)

**Page Routes**:

- `src/app/[locale]/p/[slug]/page.tsx` - Public story SSR (114 lines)
- `src/app/[locale]/s/[token]/page.tsx` - Private share SSR (123 lines)
- `src/app/[locale]/s/[token]/edit/page.tsx` - Edit redirect (31 lines)

**Database Schema**:

- `src/db/schema/stories.ts` - Tables: `stories`, `share_links`, `story_collaborators` (203 lines)
- `src/db/schema/ratings.ts` - Table: `story_ratings` (30 lines)
- `src/db/schema/enums.ts` - Enums: `accessLevelEnum`, `collaboratorRoleEnum`

**Utilities**:

- `src/lib/authorization.ts` - Access control helpers (38 lines)
- `src/lib/slug.ts` - Slug generation utilities
- `src/lib/analytics.ts` - Event tracking (used by ShareModal)

**Translations**:

- `src/messages/en-US/ShareModal.json`
- `src/messages/en-US/SharedStoryPage.json`
- `src/messages/en-US/StoryRating.json`
- (Plus 4 other locales)

---

## Migration Notes

**From v0.x to v1.0** (current version):

- Share links table introduced in migration `0007_wise_imperial_guard.sql`
- Collaborators table added in same migration
- `stories.slug` and `stories.isPublic` fields added
- Access level enum: `['view', 'edit']`
- Collaborator role enum: `['viewer', 'editor']`

**Breaking changes**: None (additive schema)

**Data migration**: Existing stories remain private by default (`isPublic = false`, `slug = null`)
