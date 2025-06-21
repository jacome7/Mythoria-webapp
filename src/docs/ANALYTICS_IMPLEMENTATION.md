# Google Analytics Event Tracking Implementation

This document describes the comprehensive Google Analytics event tracking implementation for the Mythoria webapp.

## Overview

The analytics implementation provides detailed tracking of user interactions throughout the Mythoria application, covering authentication, story creation, story management, and contact events.

## Components

### 1. Analytics Library (`src/lib/analytics.ts`)

The main analytics library provides:

- **Type-safe event tracking** with TypeScript interfaces
- **Centralized event management** with organized tracking functions
- **Automatic context enrichment** (timestamp, page location, etc.)
- **Development debugging** with console logging
- **Error handling** for robust tracking

### 2. Authentication Tracking (`src/hooks/useAuthTracking.ts`)

Automatically tracks authentication events using Clerk:

- **Sign up detection** based on account creation time
- **Login tracking** for existing users
- **Logout detection** when users sign out
- **User property setting** for enhanced analytics

### 3. Contact Form (`src/components/ContactForm.tsx`)

Functional contact form with tracking:

- **Form submission tracking** with category data
- **User interaction analytics** 
- **Success/failure tracking**

## Tracked Events

### Authentication & Onboarding

| Event | Description | Parameters |
|-------|-------------|------------|
| `sign_up` | User creates account | `user_id`, `sign_up_method` |
| `login` | User logs in | `user_id`, `login_method` |
| `logout` | User logs out | `user_id` |
| `lead_capture` | User fills newsletter form | `form_type`, `email_provided`, `already_registered` |

### Story Creation Flow

| Event | Description | Parameters |
|-------|-------------|------------|
| `story_creation_started` | User begins creating a story | `step`, `user_profile_exists` |
| `story_step1_completed` | User completes step 1 | `step`, `profile_updated`, `display_name_provided`, etc. |
| `story_step2_completed` | User completes step 2 | `step`, `story_id`, `content_type`, `has_text`, etc. |
| `story_step3_completed` | User completes step 3 | `step`, `story_id`, `character_count`, `edit_mode` |
| `story_step4_completed` | User completes step 4 | `step`, `story_id`, `title_provided`, `target_audience`, etc. |
| `story_step5_completed` | User completes step 5 | `step`, `story_id`, `ebook_selected`, `credits_deducted`, etc. |
| `character_added` | User adds a character | `character_name`, `character_type`, `character_role` |
| `character_customized` | User customizes character | `character_name`, `character_type`, `has_custom_image` |
| `story_generation_requested` | User submits for AI generation | `story_id`, `ebook_requested`, `printed_requested`, etc. |

### Story Management

| Event | Description | Parameters |
|-------|-------------|------------|
| `story_viewed` | User views a story | `story_id`, `story_title`, `story_status`, `target_audience` |
| `story_edited` | User edits story content | `story_id`, `story_title`, `edit_mode` |
| `story_shared` | User creates share link | `story_id`, `story_title`, `share_type`, `allow_edit` |
| `story_deleted` | User deletes a story | `story_id`, `story_title`, `story_status` |
| `story_listen` | User plays audio chapter | `story_id`, `story_title`, `chapter_number`, `total_chapters` |

### Contact

| Event | Description | Parameters |
|-------|-------------|------------|
| `contact_request` | User submits contact form | `form_type`, `inquiry_type`, `has_name`, `has_email` |

## Implementation Details

### Automatic Tracking

The following events are tracked automatically without additional code:

1. **Authentication events** - Tracked via `useAuthTracking` hook in `AnalyticsProvider`
2. **Page views** - Tracked via `useGoogleAnalytics` hook
3. **User properties** - Set automatically on login

### Manual Tracking

Story creation and management events require manual tracking calls in components:

```typescript
import { trackStoryCreation, trackStoryManagement } from '@/lib/analytics';

// Example: Track story creation step completion
trackStoryCreation.step1Completed({
  step: 1,
  profile_updated: true,
  display_name_provided: true
});

// Example: Track story viewing
trackStoryManagement.viewed({
  story_id: 'story-123',
  story_title: 'My Adventure'
});
```

### Integration Points

Analytics tracking is integrated at these key points:

1. **Story Creation Steps** (`/tell-your-story/step-*`) - Track completion of each step
2. **Character Management** (`CharacterCard` component) - Track character creation/editing
3. **Story Reading** (`/stories/read/[storyId]`) - Track story viewing
4. **Audio Playback** (`/stories/listen/[storyId]`) - Track audio listening
5. **Story Editing** (`BookEditor` component) - Track content editing
6. **Story Sharing** (`ShareModal` component) - Track share link creation
7. **Story Deletion** (`MyStoriesTable` component) - Track story deletion
8. **Contact Forms** (`ContactForm`, `EmailSignup`) - Track form submissions

## Configuration

The analytics system is configured in:

- **Layout** (`src/app/layout.tsx`) - GoogleAnalytics component
- **Analytics Provider** (`src/components/AnalyticsProvider.tsx`) - Global tracking setup
- **Environment** - `NEXT_PUBLIC_GA_MEASUREMENT_ID` for GA measurement ID

## Debugging

In development mode:

- All events are logged to console
- Failed tracking attempts are logged as errors
- Server-side events are logged but not sent

## Data Flow

1. User performs action → Component calls tracking function
2. Analytics library enriches event with context
3. Event sent to Google Analytics via gtag
4. Data available in GA4 dashboard for analysis

## Best Practices

1. **Use provided tracking functions** rather than calling gtag directly
2. **Include relevant context** in tracking parameters
3. **Track user journeys** not just individual actions
4. **Respect user privacy** and data preferences
5. **Test tracking** in development before deploying

## Future Enhancements

Potential improvements to consider:

1. **A/B testing integration** for feature experiments
2. **Custom conversion tracking** for business goals
3. **Enhanced e-commerce tracking** for credit purchases
4. **User segmentation** based on story preferences
5. **Real-time analytics dashboard** for monitoring
