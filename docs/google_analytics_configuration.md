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
- `story_share_method`
- `story_share_scope`
- `story_share_attribution`

Register these event-scoped metrics:

- `credits_spent`
- `credits_purchased`
- `duration_seconds`

Do not register application, payment, story, workflow, transaction, client, session, or user IDs.
In particular, `story_share_item_id` is a twelve-character opaque reference for advanced event
analysis only; it must not be registered as a custom dimension.

## Story-sharing attribution

- Emit the recommended `share` event only after clipboard, native share, WhatsApp, Facebook, or
  email handoff succeeds. A created link is not a share, and native sharing cannot identify the
  selected application or prove delivery/read.
- Share URLs use `utm_campaign=story_share`; `utm_source` is one of `whatsapp`, `facebook`,
  `email`, `copy_link`, or `native_share`; `utm_medium` is `social`, `email`, or `referral`; and
  `utm_content` is `public`, `private_view`, or `private_edit`.
- A consented, validated arrival emits `story_share_open` once per landing/session. The server
  validates its opaque reference against the actual public slug or live private token, then stores
  only the opaque reference and low-cardinality method/scope.
- A valid share touch is an independent rolling 30-day assist. It enriches `sign_up`, generation,
  checkout, `purchase`, audiobook, self-print, and print-order events with
  `story_share_attribution=within_30d`; it never replaces GA4 first-user paid/organic attribution
  or reuses an expired GA session identity.
- Do not mark `share` or `story_share_open` as key events.

Create separate GA4 explorations/audiences instead of a same-user share funnel: outbound shares,
referred sessions/opens (`story_share` campaign), first-user story-share acquisition,
share-assisted sign-ups, and downstream activation/purchase/revenue. `referred sessions / shares`
is directional only, because forwarding and repeat opens can exceed 100%.

## Privacy and validation

Inventory the actual property settings and release changes before enabling browser traffic, including Enhanced Measurement, cross-domain linking, connected destinations and Ads goals. Prior settings described above require verification in the property. Complete the isolated release checks and review the first daily export. [Analytics containment and verification](analytics/privacy-release.md)
