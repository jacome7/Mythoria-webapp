# Mythoria Google Analytics configuration

## Environment

Configure these values in every deployed environment:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: GA4 web-stream measurement ID.
- `GOOGLE_ANALYTICS_API_SECRET`: Measurement Protocol API secret.
- `NEXT_PUBLIC_GOOGLE_TAG_ID`: shared Google Tag ID when used.
- `NEXT_PUBLIC_GOOGLE_ADS_ID`: direct Google Ads conversion ID retained during migration.
- `NEXT_PUBLIC_GA_DEBUG`: set to `true` only for GA4 DebugView validation.

The legacy `NEXT_PUBLIC_GA_DEBUG_MODE` name is not used.

## GA4 and Google Ads setup

1. Link the GA4 property to Google Ads.
2. Confirm `sign_up`, `story_generation_requested`, and `purchase` in GA4 Realtime/DebugView before marking them as key events.
3. Confirm `purchase` contains one unique order `transaction_id`, `EUR` currency, net `value`, separate `tax`, exact `gross_value`, and every package in `items`.
4. Import the three GA4 key events into Google Ads as Primary conversions.
5. Change the existing direct Ads conversions to Secondary after the imported conversions are verified. Do not optimize against both delivery mechanisms as Primary.

Recommended counting:

- `sign_up`: one.
- `story_generation_requested`: every if each generated story has value; otherwise one for activation-focused campaigns.
- `purchase`: every, using the event value.

## Validation checklist

For a release candidate:

1. Enable `NEXT_PUBLIC_GA_DEBUG=true` in a non-production environment.
2. Accept analytics consent and verify one manual `page_view` on initial load and each SPA navigation.
3. Create an account and verify `user_id` is set before `sign_up`, with a stable `method`; reload and confirm signup is not emitted again.
4. Complete the story wizard and verify one `story_generation_requested` with `story_id`, workflow `run_id`, and credits; verify no `story_published` event.
5. Start a multi-package/multi-quantity Stripe test checkout and verify `begin_checkout` contains all server-returned items.
6. Complete the payment and verify one deduplicated `purchase` for the order ID with all items, net value, tax, and gross charge.
7. Inspect the server logs for Measurement Protocol failures. A missing/denied analytics consent or missing GA client ID intentionally suppresses server delivery.
8. Submit a representative payload to Google's non-reporting strict Measurement Protocol debug endpoint before production rollout.

## Suggested GA4 custom definitions

Register event-scoped custom dimensions/metrics only when they will be used in reports:

- Dimensions: `story_id`, `run_id`, `story_genre`, `payment_type`.
- Metrics: `credits_spent`, `credits_purchased`, `gross_value`.

GA4's built-in ecommerce fields (`transaction_id`, `currency`, `value`, `tax`, and item fields) do not need custom definitions.

## Funnels

- Acquisition: `page_view` → `sign_up`.
- Activation: `sign_up` → `story_creation_started` → story step events → `story_generation_requested`.
- Revenue: pricing `page_view` → `begin_checkout` → `purchase`.
- Retention: first `purchase` → paid actions → repeat `purchase`.

See [analytics.md](analytics.md) for payload semantics, consent behavior, and deferred improvements.
