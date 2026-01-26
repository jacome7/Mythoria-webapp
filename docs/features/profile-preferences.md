# Profile & Preferences Hub

## Overview
The Profile & Preferences page lets signed-in authors manage the personal details used across Mythoria (preferred name, locale, contact details, billing VAT, and notification cadence) while also surfacing account context like credits and story counts. All edits autosave without a manual “Save” action. This document describes the feature from both the end-user and developer perspectives, with explicit storage details and API flows.

## End-User Experience
### How to access
- Navigate to **Profile & Preferences** from your account area while signed in.
- If you are not authenticated, the page prompts you to sign in before showing any data.【F:src/app/[locale]/profile/page.tsx†L226-L229】

### What you see
The page is split into multiple cards:

1. **Profile Details**
   - **Preferred Name** – the name Mythoria displays across the product.
   - **Gender** – select from available options.
   - **Age Range** – choose the age range that best represents you.

2. **Contact Info & Preferences**
   - **Email Address** – displayed for reference (read-only).
   - **Mobile Phone** – optional contact number.
   - **Preferred Language** – the language used for the UI.

3. **Notification Preferences**
   - Choose how frequently and what type of communications you want to receive (Essentials, Inspiration, or News & Magic). The helper text below the dropdown updates to explain the current selection.

4. **Billing Account**
   - **VAT Number** – optional tax number used for invoices.
   - **Credit Balance** – shows your current credits. Clicking it opens a modal with a transaction history and a shortcut to buy credits.

5. **Creative Journey**
   - Displays your total story count and links to your story list.

### Saving behavior
- All changes autosave. Text fields (preferred name, mobile phone, VAT number) save after a short delay and also when the field loses focus.
- Dropdown changes save immediately.
- A small spinner or checkmark appears next to each field while it’s saving or after it saves, and a toast message confirms success or failure.【F:src/app/[locale]/profile/page.tsx†L34-L221】【F:src/app/[locale]/profile/page.tsx†L270-L632】

## Settings and Database Storage
The following settings are editable on the Profile & Preferences page and stored on the `authors` table unless otherwise noted.

| UI Field | Description | Database Column | Notes |
| --- | --- | --- | --- |
| Preferred Name | Display name used across the app | `authors.display_name` | Required; max 120 chars. Saved via `/api/profile`.【F:src/app/[locale]/profile/page.tsx†L270-L306】【F:src/app/api/profile/route.ts†L48-L71】【F:src/db/schema/authors.ts†L17-L36】 |
| Gender | Selected gender option | `authors.gender` | Enum values used by this page: `female`, `male`, `prefer_not_to_say`.【F:src/constants/profileOptions.ts†L4-L6】【F:src/db/schema/enums.ts†L179-L181】【F:src/db/schema/authors.ts†L27-L31】 |
| Age Range | Literary age range | `authors.literary_age` | Enum values used by this page: `teen`, `emerging_adult`, `experienced_adult`, `midlife_mentor_or_elder`.【F:src/constants/profileOptions.ts†L7-L14】【F:src/db/schema/enums.ts†L179-L196】【F:src/db/schema/authors.ts†L27-L32】 |
| Mobile Phone | Optional phone number | `authors.mobile_phone` | Max 30 chars; trimmed on save.【F:src/app/[locale]/profile/page.tsx†L349-L388】【F:src/app/api/profile/route.ts†L132-L150】【F:src/db/schema/authors.ts†L17-L36】 |
| Preferred Language | UI locale | `authors.preferred_locale` | Length 2–5; also synced to Clerk session locale via `/api/auth/update-locale`.【F:src/app/[locale]/profile/page.tsx†L389-L428】【F:src/app/api/profile/route.ts†L148-L166】【F:src/app/api/auth/update-locale/route.ts†L1-L65】【F:src/db/schema/authors.ts†L17-L28】 |
| Notification Level | Communication cadence | `authors.notification_preference` | Enum: `essential`, `inspiration` (default), `news`.【F:src/app/[locale]/profile/page.tsx†L432-L486】【F:src/db/schema/enums.ts†L205-L212】【F:src/db/schema/authors.ts†L39-L45】 |
| VAT Number | Optional billing tax ID | `authors.fiscal_number` | Max 40 chars; trimmed on save.【F:src/app/[locale]/profile/page.tsx†L505-L539】【F:src/app/api/profile/route.ts†L132-L140】【F:src/db/schema/authors.ts†L17-L36】 |
| Email Address | Auth email (read-only) | `authors.email` + Clerk | Email is shown from Clerk’s `primaryEmailAddress` and is not editable here.【F:src/app/[locale]/profile/page.tsx†L74-L88】【F:src/app/[locale]/profile/page.tsx†L319-L346】【F:src/db/schema/authors.ts†L17-L24】 |

Additional, read-only data surfaced on the page:

| UI Data | Source | Storage |
| --- | --- | --- |
| Credit balance + history | `/api/my-credits` | `credit_ledger` + `author_credit_balances` tables.【F:src/app/api/my-credits/route.ts†L1-L51】【F:src/components/CreditsDisplay.tsx†L20-L166】【F:src/db/schema/credits.ts†L1-L60】 |
| Story count | `/api/stories/count` | `stories` table (count by `author_id`).【F:src/app/api/stories/count/route.ts†L1-L24】 |

## Developer Implementation Notes
### Page composition
- **Entry point**: `src/app/[locale]/profile/page.tsx` is a client component that renders the entire page and orchestrates data loading, autosave, and UI feedback.【F:src/app/[locale]/profile/page.tsx†L1-L632】
- **Translations**: All labels, helper text, and option strings are pulled from the `ProfilePage` namespace in the locale JSON bundles (`src/messages/*/ProfilePage.json`).【F:src/messages/en-US/ProfilePage.json†L1-L84】
- **Options**: Gender and literary age lists are centralized in `src/constants/profileOptions.ts` and must stay aligned with the corresponding database enums.【F:src/constants/profileOptions.ts†L1-L15】

### Data fetching flow
On initial load, the page requests data in parallel:
1. `/api/profile` → returns `authors` profile data (display name, gender, age, locale, phone, VAT, notification preference).【F:src/app/api/profile/route.ts†L28-L45】
2. `/api/my-credits` → returns current credit balance and history (used by `CreditsDisplay`).【F:src/app/api/my-credits/route.ts†L1-L51】
3. `/api/stories/count` → returns total story count for the author.【F:src/app/api/stories/count/route.ts†L1-L24】

The email address is pulled directly from the authenticated Clerk user (`user.primaryEmailAddress`).【F:src/app/[locale]/profile/page.tsx†L74-L88】

### Autosave and status handling
- Each editable field has an independent status (`idle`, `pending`, `saving`, `saved`, `error`) tracked in `fieldStatus`.
- Text inputs debounce for ~700ms, while select dropdowns save immediately. Field saves also flush on blur and when the component unmounts to minimize data loss.【F:src/app/[locale]/profile/page.tsx†L34-L221】
- Success or error toasts are displayed globally with a high z-index for visibility.【F:src/app/[locale]/profile/page.tsx†L613-L629】

### API behavior and validation
- **`GET /api/profile`** returns the author record plus onboarding fields (primary goals, audiences, interests, etc.) even if they are not rendered on this page today.【F:src/app/api/profile/route.ts†L28-L45】
- **`PATCH /api/profile`** validates and persists the editable fields used by this UI, trims input, enforces length limits, and handles notification preferences. It also updates Clerk private metadata and mirrors the public `displayName`.【F:src/app/api/profile/route.ts†L48-L214】【F:src/app/api/profile/route.ts†L240-L297】
- **`POST /api/auth/update-locale`** normalizes the locale, updates the author record, and falls back to creating/syncing the author record if it doesn’t exist yet.【F:src/app/api/auth/update-locale/route.ts†L1-L73】

### Persistence details
- Core profile settings are stored in the `authors` table (see the schema in `src/db/schema/authors.ts`).【F:src/db/schema/authors.ts†L17-L52】
- Credits are stored as an immutable ledger in `credit_ledger`, with a materialized balance view in `author_credit_balances` for fast lookup.【F:src/db/schema/credits.ts†L1-L48】

### i18n and locale support
- Locale labels for the dropdown come from the `ProfilePage.languages` translation map, and supported locales are defined in `src/config/locales.ts` (via `SUPPORTED_LOCALES`).【F:src/app/[locale]/profile/page.tsx†L13-L16】【F:src/messages/en-US/ProfilePage.json†L52-L59】

## Key Extension Points
When expanding the Profile & Preferences experience:
- **Adding a new field**: update the UI component, extend `ProfileDetails`, add validation in `/api/profile`, and ensure the field exists in the `authors` table (or another appropriate table). Keep translations and enums in sync.
- **Changing options**: update `profileOptions.ts`, the DB enum in `src/db/schema/enums.ts`, and the translation labels for each locale.
- **Adjusting autosave**: tweak debounce timings in `handleFieldChange` or change the status feedback for specific fields.

