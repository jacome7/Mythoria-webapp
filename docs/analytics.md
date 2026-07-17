# Mythoria analytics lifecycle

## Canonical contract

Mythoria sends one canonical event for each product outcome. Browser events cover interaction; authoritative account, generation, purchase, and refund outcomes are written to `analytics_outbox` in the same database transaction as the outcome that they describe.

| Area              | Events                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing           | `landing_cta_click`, `landing_section_view`                                                                                                                                                                         |
| Authentication    | server `sign_up`, client `login`                                                                                                                                                                                    |
| Story             | `story_creation_started`, `story_step_viewed`, `story_step_completed`, `story_generation_attempted`, server `story_generation_requested`, workflow `story_generation_completed`, workflow `story_generation_failed` |
| Ecommerce         | `view_item_list`, `select_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, server `purchase`, server `refund`                                                                                            |
| Secondary actions | `share`, `earn_virtual_currency`, `audiobook_interaction`, `paid_action`                                                                                                                                            |

Legacy dual-send events and direct browser Google Ads conversions are disabled. The only GA4 key events are `sign_up`, `story_generation_completed`, and `purchase`.

## Identity, attribution, and privacy

- Consent Mode defaults to denied. No server event is delivered without analytics consent and a genuine GA client ID.
- Attribution records contain only allowlisted campaign parameters and sanitized internal paths, expire after 24 hours, and contain no PII or raw URLs.
- Manual `page_view` events retain only `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `gbraid`, and `wbraid`.
- Authentication, payment, token, session, code, and state parameters are removed.
- IDs used for deduplication remain operational fields and are not registered as GA4 custom definitions.

## Durable delivery

`analytics_outbox` stores sanitized Measurement Protocol payloads and retry state. The scheduler drain validates payloads with `/debug/mp/collect` and `ENFORCE_RECOMMENDATIONS`, then sends valid events to the EU `/mp/collect` endpoint with the authoritative occurrence time as `timestamp_micros`.

`story_generation_requests` is the durable generation queue. The story-completion API debits credits and inserts the request atomically under a per-author advisory lock. Duplicate idempotency keys return the stable run. A permanent publish failure issues one idempotent compensating credit.

The workflow service records terminal events only after its authoritative terminal transition. Its scheduled reconciler repairs missed outbox writes without changing the Pub/Sub `{storyId, runId}` message contract.

## Ecommerce values

`value` is net item revenue excluding tax and shipping. `tax` and `shipping` are separate. Items carry authoritative discount, coupon, variant, quantity, and net unit price where available. `gross_value`, `gross_unit_price`, and `payment_type` are not sent. A partial refund includes items only when Stripe identifies them; otherwise it contains the authoritative partial value without an invented allocation.

## References

- [GA4 recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [Measurement Protocol validation](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events)
- [Consent Mode](https://developers.google.com/tag-platform/devguides/consent)
