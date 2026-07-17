# Mythoria Google Analytics configuration

## Production target

- GA4 property: `490896080`
- Web stream: `11298562317`
- Measurement ID: `G-86D0QFW197`
- Google Ads account: `467-414-9195`

Do not modify linked Google Ads account `340-593-2333`.

## Key events and Ads goals

Keep exactly these GA4 key events:

- `sign_up`
- `story_generation_completed`
- `purchase`

In Ads, imported `sign_up` is Primary for acquisition, imported `purchase` is Primary for revenue, and imported `story_generation_completed` is Secondary. Existing direct conversion actions are Secondary. `story_generation_requested` is diagnostic and is not imported.

## Custom definitions

Register these event-scoped dimensions:

- `landing_slug`
- `cta_placement`
- `primary_intent`
- `step_number`
- `blocked_reason`
- `failure_stage`
- `failure_code`
- `action_type`
- `customer_type`

Register these event-scoped metrics:

- `credits_spent`
- `credits_purchased`
- `duration_seconds`

Do not register application, payment, story, workflow, transaction, client, session, or user IDs.

## Privacy and validation

- Keep Enhanced Measurement scroll enabled; do not add global custom scroll events.
- Redact authentication, payment, session, token, code, and state query parameters while retaining allowlisted campaign attribution.
- Validate Measurement Protocol payloads using `/debug/mp/collect` with `ENFORCE_RECOMMENDATIONS` before EU production delivery.
- Treat a 2xx delivery response as transport acceptance, not schema validation.

## Release checks

Verify one server `sign_up`, one requested and one terminal event per generation run, one purchase per Stripe order, idempotent refunds, consent denial suppression, sanitized URLs, and the landing 50%-visible-for-one-second rule. Production validation must not perform a live card charge.

See [analytics.md](analytics.md) for lifecycle and payload semantics.
