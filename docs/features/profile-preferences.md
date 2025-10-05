# Profile & Preferences Hub

## Mythoria's Take

Your author profile is more than a login. Set your pen name, pick the language you dream in, drop the VAT number for tidy invoices, and keep tabs on how many books you have shipped. Changes save themselves, so you can tweak and wander without smashing a save button.

## Technical Deep Dive

- Profile shell: `src/app/[locale]/profile/page.tsx` relies on Clerk for identity, hydrates author data via `/api/profile`, credits via `/api/my-credits`, and story counts via `/api/stories/count`.
- Autosave model: field handlers debounce and queue PATCH requests to `/api/profile`, while per-field status flags track pending/saving/saved states for responsive UI feedback.
- Locale syncing: updating `preferredLocale` triggers `/api/auth/update-locale` so Clerk sessions mirror UI language choices.
- Credit tray: integrating `CreditsDisplay` exposes transaction history and jump-off links to the buy-credits flow.
- Notification preferences: dropdown selections store enumerated values (`essential`, `inspiration`, `news`) back to the API with contextual helper text.
- Layout: the page leans on DaisyUI cards, responsive grids, and icons from `react-icons` for accessible presentation across breakpoints.

```mermaid
flowchart LR
    ProfilePage --> ProfileAPI[/api/profile]
    ProfilePage --> CreditsAPI[/api/my-credits]
    ProfilePage --> CountAPI[/api/stories/count]
    ProfilePage --> UpdateAPI[/api/profile]
    ProfilePage --> LocaleAPI[/api/auth/update-locale]
```
