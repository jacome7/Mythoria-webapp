# Analytics Event Optimization Plan

**Locale:** `en-US`
**Status:** Proposed
**Date:** 2026-07-17

## Objective

Create a small, reliable event taxonomy that can answer four questions:

1. Which campaigns and landing pages create qualified sign-ups?
2. Where do users abandon the first-story journey?
3. How many users successfully generate a story?
4. Which campaigns produce verified revenue?

Events must represent real state transitions, not page loads that merely resemble progress. Scrolls, CTA clicks, and step views are diagnostic signals and must never be Google Ads bidding goals.

## Measurement principles

- Prefer GA4 recommended events when an equivalent exists.
- Use one canonical event for one business outcome.
- Emit business outcomes from the authoritative server-side state transition.
- Use client events only for interactions that the server cannot observe.
- Keep event names stable and place variable detail in low-cardinality parameters.
- Do not send email addresses, phone numbers, Stripe session IDs, auth tokens, or unrestricted query strings.
- Do not add a custom timestamp to every event. GA4 already timestamps events.
- Do not attach the raw `window.location.href` to every event. Send a sanitized URL only with `page_view`.
- Keep direct Google Ads conversions and imported GA4 conversions from optimizing toward the same outcome at the same time.

## Recommended KPI hierarchy

| Role                    | Metric or event                       | Purpose                                                      |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------ |
| Primary acquisition KPI | `sign_up`                             | Measures verified account creation.                          |
| Primary activation KPI  | `story_generation_completed`          | Measures the first successfully generated story.             |
| Primary revenue KPI     | `purchase`                            | Measures completed credit-pack revenue.                      |
| Driver                  | Sign-up-to-generation completion rate | Diagnoses activation quality by campaign and landing page.   |
| Driver                  | Step-to-step completion rate          | Locates friction inside the story wizard.                    |
| Guardrail               | `story_generation_failed` rate        | Prevents growth from hiding generation reliability problems. |
| Guardrail               | Purchase delivery failure rate        | Confirms that completed orders reach GA4 exactly once.       |

GA4 should mark `sign_up`, `story_generation_completed`, and `purchase` as key events. Google Ads should initially optimize for `sign_up` because it has the highest expected volume. Import the deeper events as Secondary until they have enough clean volume for campaign-specific bidding.

## Canonical event taxonomy

### Acquisition and authentication

| Event               | Trigger                                                      | Source | Key event | Required parameters                                              |
| ------------------- | ------------------------------------------------------------ | ------ | --------- | ---------------------------------------------------------------- |
| `landing_cta_click` | A user selects a primary landing-page CTA.                   | Client | No        | `landing_slug`, `cta_placement`, `primary_intent`, `destination` |
| `sign_up_started`   | The Clerk sign-up form becomes usable.                       | Client | No        | `method`, `landing_slug` when available                          |
| `sign_up`           | Clerk `user.created` results in a persisted Mythoria author. | Server | Yes       | `method` when known                                              |
| `login`             | An existing account starts a new authenticated session.      | Client | No        | `method`                                                         |

Do not fire `sign_up` from a five-minute browser heuristic. The Clerk webhook or persisted-author transition must own it, with durable idempotency based on the Clerk user ID.

Before an authentication redirect, persist the consented GA `client_id`, numeric `session_id`, landing context, and campaign identifiers in a short-lived first-party attribution record. Link that record to the newly created author so the server-side `sign_up` can remain attributable without sending personal data to GA4.

### Story creation and activation

| Event                           | Trigger                                                                        | Source           | Key event | Required parameters                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------ | ---------------- | --------- | ------------------------------------------------------------------------------------- |
| `story_creation_started`        | An authenticated user makes the first meaningful input in a new story session. | Client           | No        | `story_session_id`, `landing_slug`, `primary_intent`                                  |
| `story_creation_step_viewed`    | A valid authenticated story session displays a wizard step.                    | Client           | No        | `story_session_id`, `story_id` when available, `step_number`                          |
| `story_creation_step_completed` | A step is successfully validated and persisted.                                | Client or server | No        | `story_session_id`, `story_id` when available, `step_number`                          |
| `story_generation_attempted`    | The user selects Generate, including blocked attempts.                         | Client           | No        | `story_id`, `can_generate`, `blocked_reason`, `credits_required`, `credits_available` |
| `story_generation_requested`    | Credits and the durable workflow request are committed successfully.           | Server           | No        | `story_id`, `run_id`, `credits_spent`                                                 |
| `story_generation_completed`    | The workflow publishes a complete, readable story.                             | Server           | Yes       | `story_id`, `run_id`, `duration_seconds`, `credits_spent`                             |
| `story_generation_failed`       | The workflow reaches a terminal failure state.                                 | Server           | No        | `story_id`, `run_id`, `failure_stage`, `failure_code`, `duration_seconds`             |

`story_generation_attempted` and `story_generation_requested` must remain separate. Their difference measures pricing, credit, validation, and queueing friction.

Do not emit a separate `story_published` event when `published` merely means generation completed. If the product later adds a distinct user-controlled public visibility action, use `story_made_public` for that action.

### Credit-pack ecommerce

| Event              | Trigger                                                                                  | Source                        | Key event | Notes                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------- | ----------------------------- | --------- | -------------------------------------------------------------------------- |
| `view_item_list`   | Credit packs become visible on the pricing or buy-credits page.                          | Client                        | No        | Include every visible pack in `items`. Fire once per list impression.      |
| `select_item`      | A user selects a credit pack.                                                            | Client                        | No        | Include the selected pack and list context.                                |
| `add_to_cart`      | A pack is added to the cart.                                                             | Client                        | No        | Include pack, price, quantity, and currency.                               |
| `remove_from_cart` | A pack is removed or its quantity is reduced.                                            | Client                        | No        | Include the removed quantity.                                              |
| `begin_checkout`   | The server successfully creates the Stripe Checkout session from the authoritative cart. | Client after server response  | No        | Include the authoritative `currency`, `value`, and `items`.                |
| `purchase`         | The payment order becomes `completed`.                                                   | Server, with browser fallback | Yes       | Use the same `transaction_id` for server and browser delivery.             |
| `refund`           | Stripe confirms a full or partial refund.                                                | Server                        | No        | Use the original `transaction_id`, refunded `value`, and affected `items`. |

Do not synthesize `add_payment_info` when Stripe Checkout is hosted outside the app. Add it only if a trustworthy Stripe signal exists before purchase completion.

## Purchase payload

The current implementation already includes the purchased pack metadata and the purchase value. It builds the payload from the stored order rather than reconstructing it from the browser cart.

### Required final shape

```ts
{
  transaction_id: "mythoria-order-id",
  currency: "EUR",
  value: 9.43,          // Net item revenue; excludes tax and shipping
  tax: 0.57,
  shipping: 0,
  coupon: "WELCOME",   // Only when an order-level coupon was actually applied
  customer_type: "new",
  credits_purchased: 50,
  payment_type: "card",
  items: [
    {
      item_id: "credit_package_starter",
      item_name: "50 Mythoria Credits",
      item_brand: "Mythoria",
      item_category: "Credits",
      item_variant: "starter",
      price: 9.43,
      quantity: 1,
      discount: 0.57
    }
  ]
}
```

### Purchase changes

- Keep `transaction_id`, `currency`, `value`, `tax`, `shipping`, `items`, and `credits_purchased`.
- Keep `value` equal to the sum of `item.price * item.quantity`, excluding tax and shipping.
- Add the standard `coupon`, `discount`, and `customer_type` parameters when authoritative data exists.
- Add `item_variant` using the stable package key or tier.
- Keep `payment_type` only if it is registered as a low-cardinality custom dimension and is used in reporting.
- Keep `gross_value` only if Mythoria needs a separate charged-amount metric and registers it as a currency custom metric. Otherwise retain it in internal order reporting and omit it from GA4.
- Remove `gross_unit_price` unless it is intentionally registered and used. Standard `price`, `discount`, `tax`, and `value` already describe the transaction.
- Never include a Stripe Checkout Session ID, email address, phone number, billing name, or raw address.
- Deliver `purchase` through a durable analytics outbox. A GA4 `2xx` response alone must not be treated as payload validation.

## Scroll measurement

### Recommendation

Do not implement a global custom scroll listener.

GA4 Enhanced Measurement already sends `scroll` once per page when the user reaches approximately 90% depth. Verify that this option is enabled in the GA4 web data stream and keep that event as a diagnostic event only.

For paid landing pages, raw depth percentages are less actionable than knowing which content was actually seen. Add a one-time `landing_section_view` event using `IntersectionObserver` for a small set of decision-relevant sections:

- `hero`
- `examples`
- `how_it_works`
- `pricing_or_offer`
- `faq`
- `final_cta`

Required parameters:

```ts
{
  landing_slug: "livro-personalizado-avos-netos",
  section_id: "examples",
  section_position: 2,
  primary_intent: "grandparents"
}
```

Fire each section once per page view after at least 50% of the section has remained visible for one second. Do not send events continuously while scrolling, and do not mark `scroll` or `landing_section_view` as key events.

## Events to remove or replace

| Current event                                                      | Decision                                           | Replacement or reason                                                                                                                                  |
| ------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sign_up_completed`                                                | Remove after migration validation                  | Use GA4 recommended `sign_up`.                                                                                                                         |
| `checkout_started`                                                 | Remove after migration validation                  | Use GA4 recommended `begin_checkout`.                                                                                                                  |
| `credit_pack_purchased`                                            | Remove after migration validation                  | Use GA4 recommended `purchase`.                                                                                                                        |
| `story_step_1_completed` through `story_step_4_completed`          | Combine                                            | Use `story_creation_step_completed` with `step_number`.                                                                                                |
| `story_creation_generate_clicked`                                  | Rename                                             | Use `story_generation_attempted`; retain blocked-attempt context.                                                                                      |
| `story_published`                                                  | Do not add for workflow completion                 | Use `story_generation_completed`; reserve publication for a distinct visibility action.                                                                |
| `pricing_viewed`                                                   | Remove                                             | `page_view` identifies the page; `view_item_list` measures the useful commerce exposure.                                                               |
| `logout`                                                           | Remove unless there is a defined security use case | It does not support the acquisition or activation decisions.                                                                                           |
| `share_link_created`                                               | Replace                                            | Use GA4 recommended `share` with `method`, `content_type`, and `item_id`.                                                                              |
| `promo_code_redeemed`                                              | Replace or server-authorize                        | Prefer `earn_virtual_currency` with `virtual_currency_name: "credits"`, `value`, and a low-cardinality `source`.                                       |
| `audiobook_started`                                                | Rename and deduplicate                             | Use `audiobook_interaction` with `interaction_type` set to `play` or `download`; fire first play once per story/session and downloads once per action. |
| `print_order_started`, `self_print_started`, generic `paid_action` | Combine into a lifecycle                           | Use `paid_action_started`, `paid_action_completed`, and `paid_action_failed` with `action_type`.                                                       |

## Parameters to remove from the generic event helper

The generic `trackEvent` helper should not automatically add:

- `timestamp`
- raw `page_location`
- `page_title`

GA4 collects time and page context automatically. The explicit manual `page_view` should send only a sanitized `page_location`, `page_path`, and `page_title`. Query parameters should be allowlisted; payment, authentication, and token parameters must be removed.

## Event identity and deduplication

- `purchase`: deduplicate using the stable Mythoria `transaction_id` shared by server and browser.
- `sign_up`: server-only event, idempotent by Clerk user ID and persisted delivery state.
- Story generation: server-only requested/completed/failed lifecycle, idempotent by `run_id` and event type.
- Step events: once per `story_session_id`, `step_number`, and lifecycle state.
- Landing sections: once per page view and `section_id`.
- CTA clicks: one event per deliberate click; do not debounce separate user clicks into one session-wide event.

## Custom dimensions and metrics

Register only parameters that will be used in reports or audiences.

### Event-scoped dimensions

- `landing_slug`
- `cta_placement`
- `primary_intent`
- `step_number`
- `blocked_reason`
- `failure_stage`
- `failure_code`
- `action_type`
- `payment_type`, only if retained

### Event-scoped metrics

- `credits_spent`
- `credits_purchased`
- `duration_seconds`
- `gross_value`, only if retained

Do not register high-cardinality identifiers such as `story_id`, `run_id`, `transaction_id`, or `story_session_id` as GA4 custom dimensions. Send them for debugging, deduplication, and BigQuery analysis only.

## Google Ads conversion configuration

| Outcome                      | GA4 key event                | Google Ads initial status                                 | Value                                                                   |
| ---------------------------- | ---------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Verified sign-up             | `sign_up`                    | Primary                                                   | No artificial monetary value                                            |
| Generation accepted          | `story_generation_requested` | Secondary                                                 | No artificial monetary value                                            |
| Story successfully generated | `story_generation_completed` | Secondary initially; promote when volume supports bidding | No value until a documented model exists                                |
| Credit purchase              | `purchase`                   | Primary for revenue campaigns                             | Actual gross charged amount or a deliberately chosen revenue definition |

During migration, direct Google Ads conversions must be Secondary before imported GA4 events become Primary. Remove the hard-coded EUR 1 story value.

## Implementation order

1. Fix false `story_creation_started` events and preserve the intended destination through sign-up.
2. Make story charging and workflow enqueueing atomic and idempotent.
3. Add server-side generation completion/failure events.
4. Add the analytics outbox for `purchase`, `sign_up`, and workflow events.
5. Replace legacy and duplicated events in `analytics.ts`.
6. Add credit-pack ecommerce events.
7. Add landing CTA and section visibility diagnostics.
8. Sanitize page URLs and remove generic high-cardinality parameters.
9. Register the selected custom definitions in GA4.
10. Validate one full mobile journey in Tag Assistant and DebugView before changing Google Ads bidding goals.

## Acceptance criteria

- One real account creation produces exactly one `sign_up`.
- A signed-out landing-page visitor does not produce `story_creation_started` merely by reaching the auth gate.
- Every wizard step uses the same event name and a correct `step_number`.
- A generation request produces one terminal `story_generation_completed` or `story_generation_failed` event.
- A failed workflow enqueue does not consume credits.
- One completed order produces one GA4 `purchase`, with the correct pack lines and reconciled value.
- Returning to a Stripe success URL does not create a second purchase.
- No GA4 event contains `session_id`, auth tokens, email, phone number, or unrestricted query strings.
- Scroll and section events are not key events and are not imported as Primary Google Ads conversions.
- Legacy events remain disabled after the migration verification window.

## Official references

- [GA4 recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [GA4 Enhanced Measurement events](https://support.google.com/analytics/answer/9216061)
- [GA4 event parameters](https://developers.google.com/analytics/devguides/collection/ga4/event-parameters)
- [GA4 Measurement Protocol validation](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events)
- [Google Ads primary and secondary conversion actions](https://support.google.com/google-ads/answer/10993988)
