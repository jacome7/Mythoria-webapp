# Mythoria Google Analytics Configuration Guide

This guide describes how to set up GA4 for Mythoria, wire required environment variables, and configure funnels to understand conversion from visitor → author → paying customer.

## 1) GA4 property & data stream setup

1. Create a **GA4 Property** in Google Analytics.
2. Create a **Web data stream** for the Mythoria domain.
3. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`).
4. (Recommended) Enable **Enhanced Measurement** in the data stream for baseline web interactions.

## 2) Required environment variables

Mythoria expects the following in production:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` – GA4 measurement ID used by the main tag and client events.
- `GOOGLE_ANALYTICS_API_SECRET` – Measurement Protocol API secret for server-side purchase events.
- `NEXT_PUBLIC_GOOGLE_ADS_ID` – Google Ads conversion ID for gtag conversions.
- `NEXT_PUBLIC_GOOGLE_TAG_ID` – Primary Google Tag ID (if used).
- `NEXT_PUBLIC_GA_DEBUG_MODE` (or `NEXT_PUBLIC_GA_DEBUG` if standardized) – optional debug mode flag.

> These are defined in `env.manifest.ts` and should be provisioned via Secret Manager or environment substitutions.

## 3) Consent Mode configuration

Mythoria implements Consent Mode v2 with a cookie-backed consent state:

1. **Default** consent is denied (`ad_storage`, `analytics_storage`, etc.).
2. `GoogleAnalytics` reads the consent cookie before hydration and calls `gtag('consent', 'default', ...)`.
3. Consent updates are applied with `updateGoogleConsent`.

**Recommendations**

- Ensure the cookie banner fires consent updates **before** other tracking events.
- Document consent changes for privacy compliance in the public policy pages.

## 4) Event taxonomy used by Mythoria

Mythoria uses a streamlined event set:

- **Auth:** `sign_up`, `login`, `logout`
- **Story creation:** `story_creation_started`, `story_creation_step_completed`, `story_generation_requested`
- **Paid actions:** `paid_action` (`action_type`, `credits_spent`)
- **Commerce:** GA4 `purchase`

### Optional custom dimensions / parameters

Define custom dimensions for commonly-used event parameters so they appear in GA4 reports:

- `story_id`, `story_genre`, `total_chapters`
- `purchase_amount`, `credits_purchased`, `payment_method`, `transaction_id`
- `partnership_type`, `primary_location`

## 5) Ecommerce configuration (credit bundles)

Mythoria already sends `purchase` events with `items`. To expand ecommerce insights, optionally add:

- `view_item_list` when a user views the credit package list.
- `select_item` when a package is chosen.
- `add_to_cart` when a bundle is added.
- `begin_checkout` when the payment selector is opened.
- `add_payment_info` when a payment method is chosen.

Each of these should pass `items` with `item_id`, `item_name`, `price`, and `quantity`.

## 6) Google Ads conversions

Mythoria fires Google Ads conversions via `gtag('event', 'conversion', ...)` using the Ads ID and conversion labels. Recommended setup:

1. Create conversions in Google Ads for:
   - **Sign-up**
   - **Story generation requested**
   - **Credit purchase**
2. Confirm each conversion label is mapped in code.
3. Import GA4 purchase events into Google Ads for bidding/ROAS if desired.

### Optional: Enhanced conversions

If user consent is granted, consider sending **hashed email / phone** alongside Ads conversions to improve attribution and bidding (Enhanced Conversions).

## 7) Funnels to identify conversion to paid users

Below are suggested funnels based on current UI flows and tracking. Each funnel should be configured in GA4 Explorations or as a custom funnel report.

### Funnel A: Visitor → Story creation

1. **Landing page / marketing content** (page view)
2. **Story creation started** (`story_creation_started`)
3. **Story step completed** (`story_creation_step_completed` with `step`)
4. **Generation requested** (`story_generation_requested`)
5. **Story published** (future event recommendation)

**Goal:** Identify where authors drop off during the creation wizard.

### Funnel B: Pricing → Credit purchase

1. **Pricing page view** (page view)
2. **Credit bundle selected** (recommended `select_item`)
3. **Add to cart** (recommended `add_to_cart`)
4. **Begin checkout** (recommended `begin_checkout`)
5. **Purchase** (`purchase`)

**Goal:** Measure friction in the paid conversion path.

### Funnel C: Credits → Paid actions

1. **Credits purchased** (`purchase`)
2. **Story generation** (`story_generation_requested`)
3. **Audiobook generation** (`paid_action` with `action_type: audiobook` - recommend)
4. **Print order submitted** (`paid_action` with `action_type: print` - recommend)
5. **Self-print requested** (`paid_action` with `action_type: self_print`)

**Goal:** Understand which paid features drive credit consumption and repeat purchases.

### Funnel D: Retention / repeat purchase

1. **First purchase** (`purchase`)
2. **Second purchase** (`purchase` + cohort filters)
3. **Paid actions performed** (paid feature events)

**Goal:** Determine whether paid actions correlate with repeat purchases.

## 8) Recommended improvements for tracking quality

1. **Implement “paid action” events** for audiobook generation, print orders, self‑print requests, AI edits, and story translation.
2. **Add `transaction_id` consistently** for all credit purchase events (including MB Way and redirect callbacks).
3. **Persist client_id in orders** so server-side GA4 events can be linked to client sessions.
4. **Create a tracking spec** that maps each Mythoria paid feature to GA4 event names and parameters.
5. **Expose a debug mode toggle** (align GA debug env var) and document how to validate events in GA DebugView.

## References

- GA4 Measurement Protocol: https://developers.google.com/analytics/devguides/collection/protocol/ga4
- GA4 recommended events: https://support.google.com/analytics/answer/9267735?hl=en
- Google Consent Mode: https://developers.google.com/tag-platform/devguides/consent
- Google Ads enhanced conversions: https://support.google.com/google-ads/answer/9888656?hl=en
