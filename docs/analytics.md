# Mythoria analytics lifecycle

## Canonical contract

Mythoria sends one canonical event for each product outcome. Browser events cover interaction; authoritative account, generation, purchase, and refund outcomes are written to `analytics_outbox` in the same database transaction as the outcome that they describe.

| Area               | Events                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Landing            | `landing_cta_click`, `landing_section_view`                                                                                                                                                                                          |
| Authentication     | server `sign_up`, client `login`                                                                                                                                                                                                     |
| Story              | `story_creation_started`, `story_step_viewed`, `story_step_completed`, `story_generation_attempted`, server `story_generation_requested`, workflow `story_generation_completed`, workflow `story_generation_failed`                  |
| Ecommerce          | `view_item_list`, `select_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, server `purchase`, server `refund`                                                                                                             |
| Product generation | server `audiobook_generation_requested`, workflow `audiobook_generation_completed`/`audiobook_generation_failed`, server `self_print_requested`, workflow `self_print_completed`/`self_print_failed`, server `print_order_requested` |
| Secondary actions  | `share`, `earn_virtual_currency`, `audiobook_interaction`, client-only `paid_action`                                                                                                                                                 |

Legacy dual-send events and direct browser Google Ads conversions are disabled. The only GA4 key events are `sign_up`, `story_generation_completed`, and `purchase`.

Google Ads uses `purchase` as its sole Primary conversion objective. `sign_up`, `story_generation_completed`, and checkout interactions remain Secondary diagnostics. Do not change bidding or increase spend until consented purchases, test traffic, and attribution have been reconciled. GA4 key-event status is separate from the Google Ads Primary/Secondary setting.

## Identity, attribution, and privacy

- Product access is independent of optional analytics. A confirmed Analytics grant creates an HttpOnly first-party receipt. A first-party receipt can support consented SQL reporting when no GA client or session is observable.
- The receipt stays stable across renewal and expires after 30 days of inactivity. Withdrawal expires the receipt, clears optional links and suppresses undelivered events. Regrant starts a new observation window. Existing signup, navigation and share activity before that grant stays outside analytics.
- The browser audit stream uses a fixed title, safe route templates, an empty referrer and event-specific typed parameters. Outbound Measurement Protocol likewise excludes raw Clerk IDs, story paths and titles, bearer tokens, prompt text, filenames, arbitrary properties and query strings. Google tag configuration that could emit automatic traffic is only available on an isolated audit origin.
- Advertising references require Advertising consent. Google Ads conversion goals and GA4 key events are separate property settings.
- Workflow and payment identifiers needed for internal idempotency stay in restricted operational records. Register only bounded event parameters as GA4 custom definitions.

## Durable delivery

The outbox retains queued event context. The scheduler applies the current receipt and validates the outbound envelope with `/debug/mp/collect` and `ENFORCE_RECOMMENDATIONS`. It sends an eligible event to the EU collection endpoint and rechecks the receipt before each request. Suppression reasons distinguish missing or withdrawn consent, missing context and exhausted delivery.

An HTTP success from Measurement Protocol confirms transport. Use the isolated `npm run ga4:smoke` probe to validate and independently confirm test-property ingestion. [Analytics containment and verification](analytics/privacy-release.md)

`story_generation_requests` is the durable generation queue. The story-completion API debits credits and inserts the request atomically under a per-author advisory lock. Duplicate idempotency keys return the stable run. A permanent publish failure issues one idempotent compensating credit.

Admin UI/MCP corrective restarts reuse this queue with `credits_spent = 0`. They never create a debit or refund ledger entry. If their publish retry budget is exhausted, the request becomes `delivery_failed` and `story_generation_status` becomes `failed`, while an already published story remains published and readable.

The workflow service records terminal events only after its authoritative terminal transition. It carries the stored consent receipt, attribution and page context from the durable requested-event row, and uses `story_generation_completed:<run_id>` as the completion idempotency key. GA4 receives a 12-character `run_ref`, never the raw run ID. Its scheduled reconciler repairs missed outbox writes without changing the Pub/Sub `{storyId, runId}` message contract.

## Ecommerce values

`value` is net item revenue excluding tax and shipping. `tax` and `shipping` are separate. The outbound item schema permits controlled product identifiers, discount, quantity and net unit price. `gross_value`, `gross_unit_price`, and `payment_type` are not sent. A partial refund includes items only when Stripe identifies them; otherwise it contains the authoritative partial value without an invented allocation.

## OpenAI ChatGPT Ads

Conversions for OpenAI ChatGPT Ads (browser Pixel plus server Conversions API) are documented in [openai-ads.md](openai-ads.md). They use their own `ad_conversion_outbox` table and are gated by Advertising consent, not analytics consent. Delivery shares the scheduler drain: `POST /api/internal/analytics/drain` runs `drainDurableOutboxes()`, which also fans SGW `story_generation_completed` rows out into `story_generated` and delivers the ad outbox. Ad failures are isolated from GA4 delivery and generation publishing.

## References

- [GA4 recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [Measurement Protocol validation](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events)
- [Consent Mode](https://developers.google.com/tag-platform/devguides/consent)
