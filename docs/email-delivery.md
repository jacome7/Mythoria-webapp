# Notification event identities

Updated: 2026-11-04.

See the [shared reliability contract and cutover runbook](../../docs/EMAIL_DELIVERY_RELIABILITY.md).

Welcome uses the internal author UUID. Credit emails require the payment/credit event ID; survey rewards keep their entitlement-scoped keys and print requests use the request ID. Reuse the same `Idempotency-Key` for a retried event. Copying a story creates no generation event and must not produce a story-ready email. Successful regenerations keep separate run identities.

Notification clients expose `deliveryStatus` and read the actual nested webhook result. A successful HTTP response can represent queued/held work; only `sent` confirms Gmail acceptance. Survey reward summaries expose `sent`, `accepted` and `failed` separately. No UI or template copy changes are required by this feature.
