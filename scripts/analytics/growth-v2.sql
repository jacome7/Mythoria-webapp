-- psql -X -v ON_ERROR_STOP=1 -v v2_release_at='2026-12-01T00:00:00Z' -v from='2026-12-01T00:00:00Z' -v cutoff='2026-12-08T00:00:00Z' -v timezone='Europe/Lisbon' -f scripts/analytics/growth-v2.sql
\if :{?v2_release_at}
\else
  \set v2_release_at :from
\endif
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT :'from'::timestamptz AS observation_start, :'cutoff'::timestamptz AS observation_cutoff,
  :'timezone' AS reporting_timezone, :'v2_release_at'::timestamptz AS v2_release_at;

WITH observed AS (
  SELECT snapshot, story_id, outline_id, accepted_at FROM creation_observations
  WHERE accepted_at >= :'from'::timestamptz AND accepted_at < :'cutoff'::timestamptz
), candidate_drafts AS (
  SELECT draft_ref AS ref, option, opened_at AS observed_at, 0 AS priority
  FROM creation_draft_opens
  WHERE opened_at >= :'from'::timestamptz AND opened_at < :'cutoff'::timestamptz
  UNION ALL
  SELECT coalesce((snapshot->>'draftRef')::uuid, story_id), snapshot->>'firstOption', accepted_at, 1
  FROM observed
), first_open_per_draft AS (
  SELECT DISTINCT ON (ref) option FROM candidate_drafts ORDER BY ref, priority, observed_at
)
SELECT 'first_option_opened' AS report, option AS category, count(*) AS observations
FROM first_open_per_draft GROUP BY 2
UNION ALL
SELECT 'retained_inputs', input_kind, count(*)
FROM observed CROSS JOIN LATERAL jsonb_array_elements_text(snapshot->'inputKinds') AS input_kind GROUP BY 2
UNION ALL
SELECT 'final_creation_route', snapshot->>'creationRoute', count(*)
FROM observed GROUP BY 2
UNION ALL
SELECT 'entry_kind', snapshot->>'entryKind', count(*)
FROM observed GROUP BY 2
UNION ALL
SELECT 'template_answer_count', snapshot->>'templateAnswerCount', count(*)
FROM observed WHERE snapshot ? 'templateAnswerCount' AND snapshot->>'templateAnswerCount' IS NOT NULL GROUP BY 2
ORDER BY 1, 3 DESC, 2;

-- Nearest eligible observation at submission time, never a later outline.
SELECT coalesce(observation.snapshot->>'creationRoute', 'unknown') AS final_creation_route,
  count(*) AS generation_requests, count(*) FILTER (WHERE request.status = 'completed') AS completed_runs
FROM story_generation_requests request
LEFT JOIN LATERAL (
  SELECT snapshot FROM creation_observations
  WHERE story_id = request.story_id AND accepted_at <= request.created_at
  ORDER BY accepted_at DESC, outline_id DESC LIMIT 1
) observation ON true
WHERE request.created_at >= :'from'::timestamptz AND request.created_at < :'cutoff'::timestamptz
GROUP BY 1 ORDER BY 2 DESC, 1;

SELECT (opened_at AT TIME ZONE :'timezone')::date AS day,
  left(encode(sha256(convert_to(story_id::text, 'UTF8')), 'hex'), 12) AS story_ref,
  scope, method,
  count(*) FILTER (WHERE author_id IS NULL) AS observed_browser_opens,
  count(*) FILTER (WHERE author_id IS NOT NULL) AS linked_account_opens,
  count(DISTINCT author_id) FILTER (WHERE authors.created_at >= opened_at
    AND authors.created_at < opened_at + interval '30 days' AND authors.created_at < :'cutoff'::timestamptz) AS accounts_created_after_open
FROM qualified_share_opens LEFT JOIN authors USING (author_id)
WHERE opened_at >= :'from'::timestamptz AND opened_at < :'cutoff'::timestamptz
GROUP BY 1, 2, 3, 4 ORDER BY 1, 2, 3, 4;

-- Provider snapshots contain cumulative refund arrays. Sum each successful refund ID once.
WITH first_buys AS (
  SELECT * FROM share_first_payments
  WHERE paid_at >= :'from'::timestamptz AND paid_at < :'cutoff'::timestamptz
), refund_snapshots AS (
  SELECT payment_events.order_id, charge->'refunds' AS refunds
  FROM payment_events JOIN first_buys USING (order_id)
  CROSS JOIN LATERAL (SELECT data->'charge' AS charge) payload
  WHERE event_type = 'refund_completed' AND created_at < :'cutoff'::timestamptz
), provider_refunds AS (
  SELECT DISTINCT ON (order_id, item->>'id') order_id, item->>'id' AS refund_id,
    (item->>'amount')::bigint AS amount_cents
  FROM refund_snapshots CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(refunds->'data') = 'array' THEN refunds->'data' ELSE '[]'::jsonb END
  ) item
  WHERE item->>'status' = 'succeeded' AND item->>'id' IS NOT NULL
    AND item->>'amount' ~ '^[0-9]+$' AND item->>'created' ~ '^[0-9]+$'
    AND to_timestamp((item->>'created')::double precision) < :'cutoff'::timestamptz
  ORDER BY order_id, item->>'id', (item->>'created')::bigint DESC
), refunds AS (
  SELECT order_id, sum(amount_cents) AS refund_cents FROM provider_refunds GROUP BY order_id
), incomplete AS (
  SELECT DISTINCT order_id FROM refund_snapshots
  WHERE refunds->>'has_more' = 'true' OR jsonb_typeof(refunds->'data') IS DISTINCT FROM 'array'
    OR refunds->'data' = '[]'::jsonb
)
SELECT CASE WHEN story_id IS NULL THEN 'deleted' ELSE left(encode(sha256(convert_to(story_id::text, 'UTF8')), 'hex'), 12) END AS story_ref,
  upper(currency) AS currency, count(*) AS first_buyers,
  sum(first_buys.amount_cents) AS gross_cents, sum(coalesce(refunds.refund_cents, 0)) AS observed_refunds_cents,
  count(incomplete.order_id) AS orders_with_incomplete_refunds,
  CASE WHEN count(incomplete.order_id) = 0 THEN sum(first_buys.amount_cents - coalesce(refunds.refund_cents, 0)) END AS net_cents
FROM first_buys LEFT JOIN refunds USING (order_id) LEFT JOIN incomplete USING (order_id)
GROUP BY 1, 2 ORDER BY 3 DESC, 1, 2;

SELECT event_name, CASE WHEN delivered_at IS NOT NULL THEN 'transport_submitted'
  WHEN suppression_reason IS NOT NULL THEN suppression_reason
  WHEN skipped_at IS NOT NULL THEN 'skipped_legacy'
  WHEN last_error IS NOT NULL THEN 'retry_pending' ELSE 'queued' END AS delivery_status,
  count(*) AS rows, count(*) FILTER (WHERE session_id IS NULL) AS missing_observed_session
FROM analytics_outbox
WHERE occurred_at >= :'from'::timestamptz AND occurred_at < :'cutoff'::timestamptz
GROUP BY 1, 2 ORDER BY 1, 2;

SELECT day, category, surface, outcome, count
FROM anonymous_analytics_daily
WHERE day >= (:'from'::timestamptz AT TIME ZONE 'UTC')::date
  AND day <= ((:'cutoff'::timestamptz - interval '1 microsecond') AT TIME ZONE 'UTC')::date
ORDER BY 1, 2, 3, 4;

WITH product_outcomes AS (
  SELECT created_at AS occurred_at, 'account' AS action FROM authors
  UNION ALL SELECT created_at, 'story_draft' FROM stories
  UNION ALL SELECT terminal_at, 'story_completed' FROM story_generation_requests WHERE status = 'completed'
  UNION ALL SELECT paid.completed_at, 'payment'
  FROM payment_orders paid
  WHERE (CASE WHEN jsonb_typeof(paid.metadata #> '{stripe,amountTotal}') = 'number'
      THEN (paid.metadata #>> '{stripe,amountTotal}')::numeric ELSE paid.amount END) > 0
    AND (paid.metadata #>> '{stripe,livemode}') IS DISTINCT FROM 'false'
    AND NOT EXISTS (
      SELECT 1 FROM payment_events evidence
      WHERE evidence.order_id = paid.order_id AND evidence.event_type = 'webhook_received'
        AND evidence.data #>> '{session,livemode}' = 'false'
    )
)
SELECT (occurred_at AT TIME ZONE :'timezone')::date AS day, action, 'completed' AS outcome,
  count(*) AS total
FROM product_outcomes
WHERE occurred_at >= :'from'::timestamptz AND occurred_at < :'cutoff'::timestamptz
GROUP BY GROUPING SETS ((1, 2), (2)) ORDER BY 1 NULLS LAST, 2;
COMMIT;
