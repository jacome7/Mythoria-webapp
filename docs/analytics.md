# Mythoria analytics and revenue tracking

## Event contract

Mythoria uses GA4 recommended events for conversions while retaining selected legacy events during migration.

| Product outcome            | Primary GA4 event                                                    | Temporary legacy event                 | Trigger                                                              |
| -------------------------- | -------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| Account created            | `sign_up` (`method`)                                                 | `sign_up_completed` (`sign_up_method`) | A newly-created Clerk user is observed once per browser/user.        |
| Checkout created           | `begin_checkout` (`currency`, `value`, `items`)                      | `checkout_started`                     | Stripe Checkout has been created from the server-authoritative cart. |
| Story generation requested | `story_generation_requested` (`story_id`, `run_id`, `credits_spent`) | None                                   | Credit deduction and `/api/stories/complete` have both succeeded.    |
| Credits purchased          | `purchase`                                                           | `credit_pack_purchased`                | The stored payment order is completed.                               |

`story_published` is not sent when generation starts. It should only be added later from a successful workflow-completion signal.

Direct Google Ads conversions remain enabled for sign-up, generation request, and purchase during migration. After GA4 validation, import `sign_up`, `story_generation_requested`, and `purchase` into Google Ads as Primary conversions and change the direct conversions to Secondary.

## Tag bootstrap and page views

- The root layout initializes `dataLayer`, `gtag`, and Consent Mode before React analytics hooks run.
- GA4 is configured with `send_page_view: false`. `useGoogleAnalytics` sends exactly one manual `page_view` for the initial URL and each App Router navigation.
- Events are queued in `dataLayer` if the external tag has not loaded yet and are explicitly routed to `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- `NEXT_PUBLIC_GA_DEBUG=true` adds `debug_mode: true` to GA events.
- The production Google Tag, GA measurement ID, and Ads ID remain part of one shared Google-tag topology.

## Identity and consent

- Clerk's canonical user ID is set globally with `gtag('set', { user_id })` before auth events and cleared after logout. It is never included as an event parameter.
- Social providers are normalized to stable `method` values such as `google` or `facebook`.
- Signup tracking is deduplicated per Clerk user in browser storage.
- Consent Mode defaults to denied. Client events remain governed by the Google tag's current consent state.
- GA `client_id` and numeric `session_id` are read with `gtag('get', ...)` only when `analytics_storage` is granted.
- The checkout API sanitizes those values. It stores them with Clerk User-ID and the `ad_user_data` / `ad_personalization` decisions in existing payment-order metadata.
- Server-side Measurement Protocol delivery is skipped without granted analytics consent and a genuine GA client ID. No identifier is fabricated from an application user ID.

## Purchase values and items

The stored order breakdown is the source for both browser and Measurement Protocol events. The browser does not rebuild a purchase from the cart after returning from Stripe.

| Parameter           | Meaning                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `transaction_id`    | Unique Mythoria payment order ID, identical in browser and server events for GA4 deduplication.                       |
| `currency`          | Uppercase order currency, currently `EUR`.                                                                            |
| `value`             | Net ecommerce revenue: Stripe `amount_total - tax - shipping`, in currency units.                                     |
| `tax`               | Stripe's final tax amount, reported separately.                                                                       |
| `shipping`          | Stripe's final shipping amount when non-zero.                                                                         |
| `gross_value`       | Exact amount charged by Stripe, including tax. This is also the temporary direct Ads conversion value.                |
| `credits_purchased` | Total credits across every order line and quantity.                                                                   |
| `items`             | Every stored package line with stable package key, package credits, net unit `price`, gross unit price, and quantity. |

Net cents are allocated proportionally across the stored package lines and reconciled deterministically so rounded `item.price × quantity` totals equal `value`. Discounts reflected in Stripe's final amount are therefore carried into the item revenue.

The completed-session API returns this authoritative payload to the browser. The webhook constructs the same payload and sends it to the EU Measurement Protocol endpoint with JSON content type, the same `transaction_id`, GA client/session IDs, Clerk User-ID, and explicit advertising consent.

## Revenue and paid-action coverage

Credits fund story generation, audiobook generation, print orders, self-print, and AI-assisted edits. Purchase tracking is now server-authoritative, but paid-action analytics coverage is not yet equally authoritative for every credit-consuming workflow.

Recommended next improvements:

1. Add server-side `refund` events linked to the original transaction and item quantities.
2. Add a durable analytics outbox/retry mechanism for transient Measurement Protocol failures.
3. Emit story generation completion/failure and real publication events from workflow state transitions.
4. Add `view_item_list`, `select_item`, `add_to_cart`, `remove_from_cart`, and `add_payment_info` to analyze the full credits funnel.
5. Move audiobook, print, self-print, and AI-edit paid-action events to server-authoritative success points.
6. Add privacy-reviewed Ads enhanced conversions only when the required advertising consent is granted.

## References

- [GA4 recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
- [Measurement Protocol validation](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events)
- [Transaction ID deduplication](https://support.google.com/analytics/answer/12313109?hl=en)
- [Consent Mode](https://developers.google.com/tag-platform/devguides/consent)
