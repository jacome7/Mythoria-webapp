# OpenAI ChatGPT Ads conversion tracking

Mythoria reports conversions to OpenAI ChatGPT Ads through two channels that share one event contract:

- **Measurement Pixel (browser):** the `oaiq` SDK on the explicitly configured, eligible audit origin with Advertising consent.
- **Conversions API (server):** authoritative events written to a durable outbox and delivered by the scheduled analytics drain.

Browser and server send the same event name and `event_id`, so OpenAI keeps one copy (it deduplicates on Pixel ID + event name + `event_id` and keeps the first it receives). Only **standard** events can drive conversion-optimized campaigns; custom events are reporting only.

Official docs:

- [Measurement Pixel](https://developers.openai.com/ads/measurement-pixel)
- [Conversions API](https://developers.openai.com/ads/conversions-api)
- [Supported events](https://developers.openai.com/ads/supported-events)

Code lives in `src/lib/openai-ads/` (`events.ts`, `types.ts`, `hashing.ts`, `hashing.server.ts`, `context.ts`, `outbox.ts`, `capi.ts`, `pixel.ts`) and `src/components/OpenAIAdsPixel.tsx`. Server dispatch on the canonical production origin requires `OPENAI_ADS_CAPI_DELIVERY_ENABLED=true` as well as its existing production credentials. The deployment defaults server dispatch to off while the privacy audit is pending.

## Consent model

| Channel / data                                | Without Advertising consent    | With Advertising consent                                     |
| --------------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| Browser Pixel                                 | Never loads                    | Eligible isolated audit surfaces with a distinct audit Pixel |
| Server event (Conversions API)                | Suppressed                     | Eligible after the release gate                              |
| `oppref`, `obref`, IP, user agent, hashed PII | Never captured, stored or sent | Added to the event `user` / `oppref` fields                  |

- Server consent is read from the `mythoria_consent` cookie (`preferences.advertising` or `state.ad_user_data`), independent of analytics consent.
- Revoking Advertising consent calls `oaiq("consent", false)` (the SDK drops `__oppref` / `__obref`), and the attribution revoke route nulls the stored `oppref` / `obref`. `ManageCookiesButton` also withdraws consent before reloading.
- The Pixel SDK attaches the page URL and referrer path to measures. The browser helper restricts SDK use to the isolated audit origin and approved public routes with safe URLs and referrers.
- A denied `AdContext` carries only `adConsent`, `sourceUrl` and `capturedAt`. `sanitizeAdContext` drops identifiers from denied context and uses a route template for the source URL in either case.
- Hashes follow the OpenAI rules (SHA-256 hex): email trim + lowercase; phone digits only without leading `+` or zeros (8-15 digits); external id trim only; names lowercase without whitespace or ASCII punctuation (accents kept). Browser hashing uses `crypto.subtle`; server hashing uses `node:crypto`. Never import `hashing.server.ts` from client code.

## Event map

`event_id` values come from the `adEventId.*` builders and `conversions.*` constructors in `events.ts`. Never build them by hand.

| Business event           | OpenAI event                             | Browser hook                                                                            | Server hook                                                                                                                                        | event_id                                                       |
| ------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Account registration     | `registration_completed` (standard)      | `src/app/[locale]/profile/onboarding/page.tsx` (accounts created in the last 24 h only) | `src/db/services.ts` (`createAuthor`, `syncUserOnSignIn`, in the sign-up transaction); `src/app/api/webhooks/route.ts` (Clerk webhook, idempotent) | `signup_<clerkUserId>`                                         |
| Story creation started   | `story_creation_started` (custom)        | `tell-your-story/step-2/Step2Client.tsx` (server `adEventId`)                           | `src/app/api/story-guide/draft/route.ts`, `src/app/api/stories/route.ts`                                                                           | `story_start_<storyId>`                                        |
| Story creation completed | `lead_created` (standard)                | `tell-your-story/step-5/page.tsx` (server `adEventId`)                                  | `src/lib/story-generation.ts` (`startStoryGeneration` tx; context from `src/app/api/stories/complete/route.ts`)                                    | `story_<runId>`                                                |
| Story generated          | `story_generated` (custom)               | none (server only)                                                                      | `fanOutAdConversions()` in `src/lib/openai-ads/outbox.ts`, from SGW `story_generation_completed` rows                                              | `story_generated_<runId>`                                      |
| Credits page viewed      | `contents_viewed` (standard)             | `buy-credits/page.tsx`                                                                  | none                                                                                                                                               | random UUID                                                    |
| Package selected         | `items_added` (standard)                 | `buy-credits/page.tsx`                                                                  | none                                                                                                                                               | random UUID                                                    |
| Checkout started         | `checkout_started` (standard)            | `buy-credits/page.tsx` (server `adEventId`)                                             | `src/app/api/payments/stripe/checkout/route.ts`                                                                                                    | `checkout_<orderId>`                                           |
| Credits purchased        | `order_created` (standard, EUR cents)    | `buy-credits/page.tsx` success poll (server `adConversion`)                             | `completeOrder` tx in `src/db/services/payment.ts` (next to the `purchase` outbox row)                                                             | `order_<orderId>`                                              |
| Story shared             | `story_shared` (custom)                  | `src/components/ShareModal.tsx` (server `adEventId`)                                    | `src/app/api/stories/[storyId]/share/route.ts`                                                                                                     | `share_<sha256(shareLinkId)[:12]>` or `share_<storyId>_public` |
| Audiobook requested      | `audiobook_requested` (custom)           | `AudiobookGenerationTrigger.tsx`, `stories/listen/[storyId]/page.tsx`                   | `markProductGenerationQueued` in `src/lib/product-generation.ts`                                                                                   | `audiobook_<runId>`                                            |
| Self-print requested     | `self_print_requested` (custom)          | `components/self-print/SelfPrintModal.tsx`                                              | `markProductGenerationQueued` in `src/lib/product-generation.ts`                                                                                   | `self_print_<runId>`                                           |
| Physical print requested | `print_order_requested` (custom)         | `components/print-order/PrintOrderContent.tsx`                                          | `src/app/api/print-requests/route.ts`                                                                                                              | `print_<printRequestId>`                                       |
| SPA page view            | `page_viewed` (standard)                 | `OpenAIAdsPixel.tsx` (route template, never the raw path)                               | none                                                                                                                                               | random UUID                                                    |
| Sample book opened       | `contents_viewed` (standard)             | `components/landing-pages/LandingPageBookShowcase.tsx`                                  | none                                                                                                                                               | random UUID                                                    |
| Promo / voucher redeemed | `promo_code_redeemed` (custom)           | `PromotionCodeRedeemer.tsx` (server `adEventId`)                                        | `src/app/api/codes/redeem/route.ts`                                                                                                                | `promo_<redemptionId>`                                         |
| Partner application      | `partner_application_submitted` (custom) | `PartnershipForm.tsx` (server `adEventId`)                                              | `src/app/api/partners/route.ts`                                                                                                                    | `partner_<ticketId>`                                           |
| Contact form             | `contact_submitted` (custom)             | `ContactForm.tsx` (server `adEventId`)                                                  | `src/app/api/contact/route.ts`                                                                                                                     | `contact_<ticketId>`                                           |

Notes:

- Contact and partner forms are deliberately **not** `lead_created`, so story-optimized campaigns are not polluted.
- Credit-funded actions (`story_generated`, audiobook, self-print, print, share) send `contents: [{ id, name, content_type: "service", quantity }]` with no `amount`, because credits are not money. Shares append the scope to the content id (`story_share_public`, `story_share_private_view`, `story_share_private_edit`).
- Credit purchases send `amount` and `currency` (integer minor units, EUR cents) at event level and on the package content item.
- Audiobook and self-print are enqueued only for credit-funded runs with a captured ad context. Survey-reward runs (`funding_source = 'survey_reward'`) are excluded.
- `story_generated` is enqueued only for rows SGW has written to `analytics_outbox` (see Known gaps).
- All conversions are validated by `validateConversion` (closed event allowlist, data type per event, integer non-negative amounts, `currency` required with an amount, `event_id` at most 255 characters). Invalid conversions are logged and dropped, never thrown.

## Deduplication rules

- The server is the source of truth for ids. Routes that create the business record return `adEventId` in the JSON response, and the browser passes that exact value to `trackOpenAiAdsEvent({ ...conversions.X(...), eventId: adEventId })`.
- Deterministic ids need no round trip: `signup_<clerkUserId>` and `order_<orderId>` are built identically in the browser and on the server.
- The browser `registration_completed` fires after an onboarding save only when the account is new: `author.createdAt` from the `PATCH /api/profile` response (falling back to Clerk `user.createdAt`) must be within the last 24 hours. Unknown creation times never fire, so returning users editing their profile are not counted.
- `order_created` values match on both channels: `GET /api/payments/stripe/session` returns `adConversion` (the exact `buildCreditOrderConversionInput(order)` the server enqueued, omitted if it cannot be built) once the order is completed, and `buy-credits/page.tsx` sends `conversions.orderCreated(adConversion)`. It falls back to the response totals only when `adConversion` is missing or belongs to another order.
- Private share links use a hashed reference (`sha256(shareLinkId)[:12]`) because the link id is a bearer token. Public sharing uses `<storyId>_public`.
- Browser-only events (`page_viewed`, `contents_viewed`, `items_added`) use a random UUID, since no server counterpart exists.
- Server inserts are deduplicated by the unique index `(destination, dedupe_name, event_id)`, where `dedupe_name = custom_event_name ?? event_type`. A retry or a repeated webhook never creates a second row.

## `oppref` / `obref` capture flow

1. An ad click lands on a URL with `?oppref=...`. `oppref` is in `CAMPAIGN_QUERY_KEYS` (`src/lib/campaign-context.ts`), so it survives same-origin navigation and auth return URLs before consent. It is kept up to 512 characters (other campaign values: 255).
2. With Advertising consent, the Pixel SDK reads `oppref` from the URL and sets `__oppref` (30 days) and `__obref` (365 days). `AnalyticsAttributionCoordinator` keeps `oppref` in the URL until `mythoria:oaiq-loaded` fires (plus a short read delay, 5 s timeout) and then strips it. Without consent it strips it immediately.
3. `POST /api/analytics/attribution` stores `oppref`, `oppref_captured_at` and `obref` on `analytics_attributions`, **only** with Advertising consent. Revoke nulls them.
4. `resolveAdContext` (server) builds an `AdContext` per request: when granted, `oppref` / `obref` from the cookies (falling back to the author's stored `oppref` captured within 30 days), the first `x-forwarded-for` hop as IP, the user agent, and a sanitized same-origin `sourceUrl` (no query string). When denied, only the consent flag, source URL and capture time.
5. Purchases keep the context in `payment_orders.metadata.ads` (checkout time), read back at webhook time (`completeOrder` copies it into `ad_conversion_outbox` in the completion transaction). Each drain then removes it with `scrubPaymentOrderAdContext()` (see the drain below). Audiobook and self-print store it in `product_generation_requests.ad_context`, which is nulled once the run is queued (handed to the outbox) or failed. Other routes pass it straight to `enqueueAdConversion`.

## `ad_conversion_outbox` lifecycle

Table defined in `src/db/schema/analytics.ts`, created by migration `drizzle/0049_openai_ads_conversions.sql`.

1. **Enqueue** (`enqueueAdConversion(executor, { conversion, authorId, adContext, occurredAt })`): validates, then inserts with `ON CONFLICT DO NOTHING` inside a **savepoint** (nested transaction), so a failure can never abort the caller's business transaction. It never throws. It is called inside the business transaction where one exists (sign-up, story lead, purchase completion, product queue) and right after the business write otherwise (routes).
2. **Fan-out** (`fanOutAdConversions`): each drain turns SGW-written `analytics_outbox` rows named `story_generation_completed` (last 6 days, up to 100 per run, no matching ad row) into `story_generated`. The `runId` is parsed from the `story_generation_completed:<runId>` dedupe key. Context is copied from the run's `lead_created` row while it still has one.
3. **Drain** (`deliverAdConversions`): runs inside `drainDurableOutboxes()` (`src/lib/analytics/outbox.ts`) via `POST /api/internal/analytics/drain`, shared with the GA4 drain and generation publishing. Ad failures are isolated and never break the other drains.
   - Without `OPENAI_ADS_CAPI_KEY` and the Pixel ID, nothing is sent and rows stay pending; rows past the 7-day window are still expired (`expired_7d`, `ad_context` nulled) so no raw IP or user agent is kept while the key is missing.
   - Claims up to 100 pending rows (oldest first) with a claim token; abandoned claims are reclaimed after 5 minutes.
   - **Age limit:** rows older than about 7 days are skipped with `last_error = 'expired_7d'` (OpenAI rejects older events).
   - **Enrichment / defer:** a row without `ad_context` but with an `author_id` (for example a Clerk-webhook sign-up) looks up the author's latest `analytics_attributions` row for consent, `oppref` and `obref`. If none exists it is deferred every 15 minutes (`last_error = 'awaiting_ad_context'`) for up to 2 hours, then sent as denied. Rows without an author are sent as denied.
   - **User data:** only when consent is `granted`, `user` is built from the author row (hashed email, phone, first and last name, `external_ids_sha256 = [sha256(clerkUserId)]`, country) plus raw `obref`, `ip_address`, `user_agent`; `oppref` is added to the event. Closed accounts get no hashed PII. Denied events get `opt_out: true` and no identifiers.
   - **Batching:** one request per drain (up to 100 events). On a non-retryable HTTP error for a multi-event batch (one invalid event fails the whole batch), each event is resent alone to isolate the bad one. Isolation stops 2 minutes after the drain started (well inside the 5-minute abandoned-claim window); the rows not reached are released without consuming an attempt (counted as `deferred`) and retried on the next drain.
   - **Retries:** HTTP 429, 5xx, timeouts and network errors retry with backoff `min(60, 2^attempts)` minutes, up to 8 attempts. Other 4xx are permanent and skip the row. 401/403 (bad key) retry in 15 minutes without consuming an attempt.
   - **On success:** `delivered_at` is set and **`ad_context` is nulled**, so no raw IP or user agent is retained. Expired and permanently failed (skipped) rows also null it.
4. **Payment-order scrub** (`scrubPaymentOrderAdContext`, after delivery, isolated in its own try/catch, runs even without the API key): removes only the `ads` key (`metadata - 'ads'`, `updated_at` untouched) from up to 500 `payment_orders` per run whose status is `completed`, `cancelled` or `expired`, or that are older than 7 days. `failed` is not treated as terminal because a declined card can be retried in the same Checkout Session; such orders are scrubbed by the 7-day rule (Checkout Sessions expire within 24 hours). Rows locked by a payment worker are skipped (`FOR UPDATE SKIP LOCKED`). The drain response reports `ads.paymentScrub`.
5. Structured logs use the `[AdConversionOutbox]` prefix with a 12-character hashed `eventRef`, never PII.

## Environment and configuration

| Variable                         | Kind               | Where configured                                                                                                                                                                                                                                              | Notes                                                                                                                              |
| -------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_OPENAI_PIXEL_ID`    | public, build-time | `cloudbuild.yaml` substitution `_NEXT_PUBLIC_OPENAI_PIXEL_ID`, Dockerfile ARG/ENV, `.env.production`, `.env.local`, `env.manifest.ts`                                                                                                                         | Public, not a secret: `8DT4ALLW8yvPUUYcaz21vb`. Unset disables everything.                                                         |
| `NEXT_PUBLIC_OPENAI_PIXEL_DEBUG` | public, build-time | `cloudbuild.yaml` substitution (`'false'`), Dockerfile, `.env.local` (`true`)                                                                                                                                                                                 | Enables SDK debug logging in the browser console.                                                                                  |
| `OPENAI_ADS_CAPI_KEY`            | secret, runtime    | Secret Manager secret `OPENAI_CONVERSIONS_API_KEY` (`projects/803421888801/secrets/OPENAI_CONVERSIONS_API_KEY`, bound by `scripts/setup-secrets.ps1`), mapped in `cloudbuild.yaml` `--set-secrets` as `OPENAI_ADS_CAPI_KEY=OPENAI_CONVERSIONS_API_KEY:latest` | Conversions API key from Ads Manager. The code reads `OPENAI_ADS_CAPI_KEY`; locally it is unset unless you add it to `.env.local`. |

The transport (`capi.ts`) posts to `https://bzr.openai.com/v1/events?pid=<PIXEL_ID>` with `Authorization: Bearer <key>`, `integration_source: "mythoria-webapp"`, a 10 s timeout, and a limit of 1,000 events per batch. Run `npm run check:env` after any change.

## Rollout steps

Current state (2026-11-17): **live in production** — migration `0049` applied, Cloud Run revision `mythoria-webapp-00241-zck` (git `84e8f62`) serving 100%, the Secret Manager secret `OPENAI_CONVERSIONS_API_KEY` mapped to `OPENAI_ADS_CAPI_KEY`, and the first drain delivered 10 backfilled `story_generated` events with no errors. Only `mythoria-webapp` changed; Story Generation Workflow needs no deploy (its existing `analytics_outbox` rows are fanned out by the WebApp drain).

> Deploy note: Cloud Run traffic had been pinned to a named revision since 2026-11-10, so new revisions received no traffic. It was reset with `gcloud run services update-traffic mythoria-webapp --to-latest --region europe-west9`. If the post-deploy health SHA mismatches, check `spec.traffic` on the service. Roll back with `--to-revisions=<previous-revision>=100`.

1. Make sure the Cloud Build and Cloud Run (Compute Engine default) service accounts have `roles/secretmanager.secretAccessor` on `OPENAI_CONVERSIONS_API_KEY`. `scripts/setup-secrets.ps1` adds these bindings whenever the secret exists (set `OPENAI_CONVERSIONS_API_KEY` in the environment only if you want to add a new secret version). A missing secret or binding fails the deploy.
2. Apply migration `0049` (`npm run db:migrate`) before deploying. It is additive only; the database is shared by development and production.
3. Deploy. Server events are sent live to OpenAI from the first drain.
4. Verify in Ads Manager with the **Test** flow and **Event Stream**: browser events show source `pixel_sdk`, server events `server_to_server`, duplicates collapse. Locally use `NEXT_PUBLIC_OPENAI_PIXEL_DEBUG=true`, land on `/?oppref=test123`, accept all cookies and confirm `oaiq` initializes and `__oppref` / `__obref` are set.
5. In Ads Manager, create conversion event settings: `order_created` (primary), `lead_created`, `registration_completed`. Custom events are reporting only.

To pause server-side delivery, remove the `OPENAI_ADS_CAPI_KEY` mapping from `--set-secrets` and redeploy: rows then stay pending and expire after about 7 days.

## ChatGPT Ads Manager configuration

Everything on the website side is done. In Ads Manager, the remaining setup lives under the **Conversions** tab.

### 1. Check events are arriving (Conversions → Data Source)

- Open the Web Pixel's menu and choose **Test**. Enter `https://mythoria.pt` and start the test.
- Use the site in that browser:
  - Accept **all cookies**, including Advertising; the pixel never loads without Advertising consent.
  - Browse a few pages, open the credits page, and start a story.
- In **Event Stream**, browser events are tagged `pixel_sdk` and server events `server_to_server`.
- Test labelling lasts up to 30 minutes on the same origin, and test events count in normal statistics. Event Stream may show only a sample, with a delay.

### 2. Create conversion event settings

Create one setting per event, all using the same Web Pixel data source (reuse the existing source; don't create a new one):

| Setting         | Event                    | Why                                                                                           |
| --------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| Credit purchase | `order_created`          | The real revenue event. Carries the value in EUR minor units, so you get ROAS. **Main** goal. |
| Story created   | `lead_created`           | The key activation step (user submits a story for generation).                                |
| Sign-up         | `registration_completed` | Top of the funnel.                                                                            |

Optionally add custom events for reporting. Their names must match exactly: `story_creation_started`, `story_generated`, `story_shared`, `audiobook_requested`, `self_print_requested`, `print_order_requested`, `promo_code_redeemed`, `partner_application_submitted`, `contact_submitted`. **Custom events can't be used as a campaign's optimization goal.**

### 3. Choose the optimization goal for each campaign

- **Conversion-optimized** campaigns take exactly one active standard event as their goal. **The goal and the event can't be changed after the campaign is created**; optimizing for a different event means creating a new campaign.
  - `order_created` if there are enough purchases (the best signal).
  - `lead_created` if purchases are too few for the algorithm to learn. Stories are much more frequent, and a story usually comes before a purchase.
- The bid is a cost per conversion, but billing is per valid click.
- If campaign creation fails with "Conversion bidding is not enabled", the account needs it enabled by the OpenAI partner contact.
- **Click or impression campaigns** can still have these settings attached for tracking, without changing their objective. Updating a campaign's attached settings replaces the whole list, so include every setting to keep.

### 4. Leave "Automatic advanced matching" off

We already send hashed email and user ID ourselves, and only when the visitor accepted Advertising cookies. If it is turned on, the pixel also scans pages for personal data, which bypasses that consent control.

### What to expect in reports

- A purchase or story whose browser and server copies were merged appears **once**. That's the intended deduplication.
- Visitors who reject Advertising cookies still count as conversions (sent with `opt_out: true`), but without identifiers, so they usually can't be linked to a specific ad click.
- Click-through conversions use the configured click window. View-through conversions use a fixed 1-day window and are shown as a separate campaign metric, not in "Conversions". When both apply, the click wins.
- After the first real sign-up, story submission and purchase, check Event Stream to confirm each standard event appears once.

## CSP hosts (for when a Content-Security-Policy is added)

No CSP exists today. When one is added, allow:

- `script-src https://bzrcdn.openai.com`
- `connect-src https://bzr.openai.com https://bzrcdn.openai.com`
- `img-src https://bzr.openai.com`

## Known gaps

- **Refunds:** OpenAI has no refund event, so refunds are not reported.
- **Admin manual MB Way purchases and credit grants:** no user or browser context, not tracked.
- **MCP / ChatGPT-app story creation:** no browser or consent context, not tracked. Product requests without a captured ad context are not reported.
- **`story_generated`:** only produced when SGW has written a `story_generation_completed` row to `analytics_outbox`. Fan-out looks back 6 days.
- **`payment_orders.metadata.ads`** holds the raw checkout-time ad context until the next drain after the order completes, expires or is cancelled, and for up to 7 days for pending, processing or failed orders. Mythoria Admin's fiscal document API (`/api/admin/fiscal-documents`, list and detail) returns `paymentOrder.metadata` unfiltered, so it exposes `ads` to admins during that window (the UI only renders `metadata.stripe`).
- **`oppref` persistence** (the server-side fallback for later conversions such as webhook sign-ups) requires the analytics attribution row, which is only written with analytics consent as well as Advertising consent. Cookie-based capture needs only Advertising consent.

## Adding a conversion point

1. Add a constructor to `conversions` (and an `adEventId` builder) in `events.ts`, plus the event name to the allowlist if it is custom. Add tests in `events.test.ts`.
2. Server: call `enqueueAdConversion` inside the business transaction (or right after the write for routes), with `resolveAdContextSafely` or a stored context. Return `adEventId` in the response.
3. Browser: call `trackOpenAiAdsEvent({ ...conversions.X(...), eventId: <server adEventId> })` next to any existing GA4 call.
4. Never send PII, IP, user agent, `oppref` or `obref` without Advertising consent, and never put private ids or tokens in `event_id` or content ids (hash them).

## Troubleshooting

**Pixel not firing:** check that `NEXT_PUBLIC_OPENAI_PIXEL_ID` was inlined at build time, that the visitor accepted Advertising cookies, and set `NEXT_PUBLIC_OPENAI_PIXEL_DEBUG=true` (console logs from the SDK; `[OpenAIAds]` warnings appear in development for dropped or invalid conversions).

**Inspect the outbox:**

```sql
-- Pending or retrying rows
SELECT event_type, custom_event_name, event_id, attempts, available_at, last_error, occurred_at
FROM ad_conversion_outbox
WHERE delivered_at IS NULL AND skipped_at IS NULL
ORDER BY occurred_at;

-- Skipped (permanent failure or expired) rows
SELECT event_type, custom_event_name, event_id, attempts, last_error, occurred_at
FROM ad_conversion_outbox
WHERE skipped_at IS NOT NULL
ORDER BY skipped_at DESC
LIMIT 50;

-- Delivery summary for the last 7 days
SELECT dedupe_name,
       count(*) AS total,
       count(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered,
       count(*) FILTER (WHERE skipped_at IS NOT NULL) AS skipped
FROM ad_conversion_outbox
WHERE created_at > now() - interval '7 days'
GROUP BY dedupe_name
ORDER BY total DESC;
```

**`last_error` values:**

| Value                                                         | Meaning                                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `awaiting_ad_context`                                         | Waiting up to 2 hours for an attribution row (consent, `oppref`) for this author. Not a failure.            |
| `expired_7d`                                                  | Older than about 7 days when picked up, so OpenAI would reject it. Skipped.                                 |
| `HTTP 401` / `HTTP 403 ...`                                   | Key rejected. Check `OPENAI_ADS_CAPI_KEY` and the Pixel ID. Retries every 15 minutes, no attempts consumed. |
| `HTTP 400 ...`                                                | Invalid event (the body explains which field). Isolated and skipped permanently.                            |
| `HTTP 429` / `HTTP 5xx`, `Request timed out`, network message | Transient. Retried with backoff, up to 8 attempts.                                                          |
| `OpenAI Conversions API is not configured`                    | Key or Pixel ID missing at send time.                                                                       |

If many rows stay pending with no `last_error`, the drain is not running or credentials are missing: check the scheduler job for `POST /api/internal/analytics/drain` and the `[AnalyticsDrain]` / `[AdConversionOutbox]` logs (the drain response includes `ads.fanOut`, `ads.delivery` and `ads.paymentScrub` counts).
