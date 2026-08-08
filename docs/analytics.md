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
- Attribution records contain only allowlisted campaign parameters and sanitized internal paths, expire after 24 hours, and contain no PII or raw URLs. The first touch is immutable; later captures update only the latest path, referrer, session, consent, and expiry.
- Durable events carry the attribution row ID plus sanitized same-origin `page_location`/`page_referrer`. Query strings, UUID path segments, private share tokens, raw click IDs, email addresses, prompts, and story/chapter content are excluded from Measurement Protocol parameters.
- Manual `page_view` events retain only `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `gbraid`, and `wbraid`.
- Authentication, payment, token, session, code, and state parameters are removed.
- IDs used for deduplication remain operational fields and are not registered as GA4 custom definitions.

## Durable delivery

`analytics_outbox` stores sanitized Measurement Protocol payloads and retry state. The scheduler drain validates payloads with `/debug/mp/collect` and `ENFORCE_RECOMMENDATIONS`, then sends valid events to the EU `/mp/collect` endpoint with the authoritative occurrence time as `timestamp_micros`.

An HTTP `2xx` from Measurement Protocol means only that Google received the transport request. The debug endpoint validates the payload but does not validate the API secret. Consequently, `delivered_at` means “submitted to transport”, not “confirmed in GA4”. Every production release must run `npm run ga4:smoke`, which sends `analytics_delivery_probe` and polls the Realtime Data API until ingestion is independently confirmed.

The deployment script obtains the Realtime read token by impersonating `analytics-scheduler@oceanic-beach-460916-n5.iam.gserviceaccount.com` with the `analytics.readonly` OAuth scope. That service account must remain a GA4 property Viewer, and the human or CI identity running the deployment needs `roles/iam.serviceAccountTokenCreator` only on that service account. No service-account key is required or permitted for this smoke.

`story_generation_requests` is the durable generation queue. The story-completion API debits credits and inserts the request atomically under a per-author advisory lock. Duplicate idempotency keys return the stable run. A permanent publish failure issues one idempotent compensating credit.

Admin UI/MCP corrective restarts reuse this queue with `credits_spent = 0`. They never create a debit or refund ledger entry. If their publish retry budget is exhausted, the request becomes `delivery_failed` and `story_generation_status` becomes `failed`, while an already published story remains published and readable.

The workflow service records terminal events only after its authoritative terminal transition. It copies the consented `user_id`, immutable first-touch attribution, and sanitized page context from the durable requested-event row, and uses `story_generation_completed:<run_id>` as the completion idempotency key. GA4 receives a 12-character `run_ref`, never the raw run ID. Its scheduled reconciler repairs missed outbox writes without changing the Pub/Sub `{storyId, runId}` message contract.

## Ecommerce values

`value` is net item revenue excluding tax and shipping. `tax` and `shipping` are separate. Items carry authoritative discount, coupon, variant, quantity, and net unit price where available. `gross_value`, `gross_unit_price`, and `payment_type` are not sent. A partial refund includes items only when Stripe identifies them; otherwise it contains the authoritative partial value without an invented allocation.

## References

- [GA4 recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [Measurement Protocol validation](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events)
- [Consent Mode](https://developers.google.com/tag-platform/devguides/consent)
