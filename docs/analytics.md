# Mythoria Analytics & Revenue Tracking

## Purpose

This document summarizes how Mythoria currently integrates Google Analytics (GA4) and Google Ads tracking, which user actions are captured, and where revenue/credit flows occur in the product. It is derived from the current codebase and feature documentation.

## Revenue streams & credit-required operations

Mythoria monetizes through **credit bundles** that unlock paid operations and downstream fulfillment services (printing and audio). Credits are purchased in bundles via the pricing/buy flow and then consumed by billable actions.

### Operations that require credits

1. **Story generation (eBook creation)**
   - The Story Creation flow (Step 5) requires credits and blocks the generation action when balance is insufficient.
   - Credits are deducted before the generation workflow is triggered.

2. **Audiobook generation / re-narration**
   - The Listen page allows users to generate or re-generate audiobooks; credits are validated and deducted before the narration workflow starts.

3. **Print & ship orders (keepsake)**
   - The print ordering wizard calculates total credits for print, extra chapters, extra copies, and shipping. Credits are verified before order creation and deducted after order/ticket creation succeeds.

4. **Self‑print (PDF download)**
   - Self‑print credits are validated and deducted immediately before the SGW self‑print workflow is triggered. Credits are refunded on failures.

5. **AI-assisted edits**
   - AI text edits and image edits have free tiers, then charge credits based on pricing rules. Credit deductions are performed when edits are recorded.

### How credits are bought

1. **Pricing page** surfaces credit bundles and service pricing, linking into the buy flow.
2. **Buy Credits page** lets users add bundles to a cart, provide billing information, redeem promo codes, and pay via **Revolut Pay** or **MB Way**.
3. **Orders + payment** are created server-side; successful orders add credits to the ledger and trigger analytics events.

## Google Analytics integration (current state)

### 1) Tag injection & Consent Mode

- The root layout injects the Google Analytics tag and IDs, plus optional Google Ads and Google Tag IDs.
- `GoogleAnalytics` initializes `gtag`, reads the consent cookie **before hydration**, and sets Consent Mode defaults to denied for analytics and ads storage.
- Consent updates are handled via a shared consent utility (`updateGoogleConsent`).

### 2) Pageview tracking

- `useGoogleAnalytics` runs on route changes and sends a `gtag('config')` call with the current `page_location` and `page_title`.
- This hook is wired in the global `AnalyticsProvider` and runs in a `Suspense` boundary.

### 3) Client-side event tracking (`src/lib/analytics.ts`)

Mythoria uses a lightweight wrapper around `gtag('event')` with a **core-only** event contract:

- **Auth events**: `sign_up`, `login`, `logout`.
- **Commerce**: GA4 `purchase` event for credit bundles.
- **Story creation**: `story_creation_started`, `story_creation_step_completed` (with `step`), `story_generation_requested`.
- **Paid actions**: `paid_action` with `action_type` and optional `credits_spent`.

### 4) Google Ads conversions

- `trackMythoriaConversionsEnhanced` sends Google Ads conversion events for:
  - **Sign-up**
  - **Story creation**
  - **Credit purchase**
- These are triggered inside the relevant tracking calls (auth sign-up, story generation request, credit purchase).

### 5) Server-side GA4 Measurement Protocol

- A server-side purchase event is sent via the GA4 Measurement Protocol once a payment order completes.
- This requires `NEXT_PUBLIC_GA_MEASUREMENT_ID` and `GOOGLE_ANALYTICS_API_SECRET`.

## Detailed tracking coverage (by feature)

| Feature area   | Tracked events                                                                          | Where triggered                                                                  |
| -------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Authentication | `sign_up`, `login`, `logout`, user properties, user_id                                  | `useAuthTracking` hook triggers auth events and sets user properties.            |
| Story creation | `story_creation_started`, `story_creation_step_completed`, `story_generation_requested` | Story creation step pages.                                                       |
| Paid actions   | `paid_action` (`ebook`, `self_print`)                                                   | Story generation request + self-print modal.                                     |
| Buy credits    | GA4 `purchase`, Google Ads conversion                                                   | Buy credits page + Google Ads conversions for completed payment intent/checkout. |
| Page views     | `gtag('config')`                                                                        | `useGoogleAnalytics` on route changes.                                           |

## Minimal event map (core contract)

| Event name                      | Required parameters                            | Optional parameters                      | Trigger                                         |
| ------------------------------- | ---------------------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| `sign_up`                       | —                                              | `user_id`, `sign_up_method`              | `useAuthTracking` when a new user signs up.     |
| `login`                         | —                                              | `user_id`, `login_method`                | `useAuthTracking` on login.                     |
| `logout`                        | —                                              | `user_id`                                | `useAuthTracking` on logout.                    |
| `story_creation_started`        | —                                              | `story_id`, `story_genre`                | Step 1 entry to the wizard.                     |
| `story_creation_step_completed` | `step`                                         | `story_id`                               | After each wizard step.                         |
| `story_generation_requested`    | `story_id`                                     | `has_dedication`, `has_delivery_address` | When the generation workflow is triggered.      |
| `paid_action`                   | `action_type`                                  | `story_id`, `credits_spent`              | Paid actions (currently `ebook`, `self_print`). |
| `purchase`                      | `transaction_id`, `value`, `currency`, `items` | `payment_method`                         | Credit bundle checkout completion.              |

## External best-practice references used

- GA4 Measurement Protocol: https://developers.google.com/analytics/devguides/collection/protocol/ga4
- GA4 recommended events guidance: https://support.google.com/analytics/answer/9267735?hl=en
- Google Consent Mode: https://developers.google.com/tag-platform/devguides/consent
- Google Ads enhanced conversions: https://support.google.com/google-ads/answer/9888656?hl=en

## Potential fixes & improvements (implementation recommendations)

> These items reflect gaps or opportunities based on current implementation details and GA4/Ads best practices.

1. **Align GA debug flag usage**
   - The code uses `NEXT_PUBLIC_GA_DEBUG_MODE`, while the manifest declares `NEXT_PUBLIC_GA_DEBUG`. Standardize on one flag to avoid silent misconfiguration.

2. **Add server-side `client_id` capture**
   - The server-side GA4 purchase event currently uses `user_id` only. Persisting the GA `client_id` (from the `_ga` cookie) in order metadata would improve attribution and cross-device stitching.

3. **Ecommerce lifecycle events**
   - Add optional GA4 `view_item_list`, `select_item`, `add_to_cart`, and `begin_checkout` events for the credit-pack shopping flow to build a deeper funnel (GA4 recommended event pattern).

4. **Consent-aware event buffering**
   - Today, `trackEvent` assumes `window.gtag` exists; you can queue events in `dataLayer` when Consent Mode is denied and replay once consent is granted (improves completeness while honoring privacy rules).

5. **Enhanced conversions for Ads**
   - If consent allows, send hashed email/phone at conversion time for improved Ads attribution and Smart Bidding (see Google Ads enhanced conversions). This would require explicit hashing and consent gating.

6. **Story-level conversion taxonomy**
   - Consider a standardized event model for paid actions (ebook generation, audiobook, print, self-print, AI edits) so GA4 can report revenue per action type in a consistent schema.

7. **Missing event for AI edits**
   - AI edits consume credits but are not currently emitted as discrete analytics events. Add explicit `ai_edit_requested` / `ai_edit_completed` events (with action type and credit cost) to measure paid usage beyond story generation.

8. **Ads / GA integration sanity checks**
   - Validate that `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_TAG_ID`, and GA Measurement ID are aligned across environments, and confirm tag de-duplication (GTAG config is intentionally not duplicated, but any extra tag managers could double-fire pageviews).

## Simplified tracking rules (implemented)

1. **Core events only**
   - Track `sign_up`, `login`, `story_creation_started`, `story_creation_step_completed`, `story_generation_requested`, `paid_action`, and GA4 `purchase` only.
2. **Collapsed wizard steps**
   - The story wizard uses a single `story_creation_step_completed` event with `step` to measure funnel drop-off.
3. **Unified paid action event**
   - All credit-consuming actions emit `paid_action` with `action_type` and optional `credits_spent`.
4. **Standardized payloads**
   - Core parameters are consistent (`story_id`, `credits_spent`, `transaction_id`, `payment_method`), and we removed `story_title` and `chapter_number`.
5. **Thin tracking wrapper**
   - All events are routed through a single `trackEvent` helper.
6. **Limited Ads conversions**
   - Ads conversions stay limited to `sign_up`, `story_generation_requested`, and `purchase`.
7. **GA4 ecommerce focus**
   - Only GA4 `purchase` is emitted for credit bundles (no extra ecommerce noise).
