-- psql -X -v ON_ERROR_STOP=1 -v cutoff=2027-01-01T00:00:00Z -f product-experiment-readout.sql
-- Run against the restricted reporting replica. Required workflow_usage projection is documented.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL TIME ZONE 'UTC';
WITH cohort AS (
  SELECT a.*, r.revoked_at, r.author_id,
    row_number() OVER (PARTITION BY a.experiment_id, r.author_id ORDER BY a.assigned_at, a.attribution_id) AS author_rank
  FROM product_experiment_assignments a
  JOIN analytics_attributions r USING (attribution_id)
  WHERE a.assigned_at < :'cutoff'::timestamptz
), participants AS (
  SELECT c.*,
    c.assigned_at + interval '7 days' <= :'cutoff'::timestamptz AS mature7,
    c.assigned_at + interval '30 days' <= :'cutoff'::timestamptz AS mature30,
    CASE WHEN c.revoked_at IS NULL AND c.author_rank = 1 THEN c.author_id END AS outcome_author
  FROM cohort c
), observed AS (
  SELECT p.*, story.first_done, story.unknown_done, paid.first_paid, paid.unknown_paid
  FROM participants p
  LEFT JOIN LATERAL (
    SELECT min(done_at) AS first_done, bool_or(done_at IS NULL) AS unknown_done
    FROM (
      SELECT coalesce(min(r.terminal_at), s.published_at) AS done_at
      FROM stories s LEFT JOIN story_generation_requests r
        ON r.story_id = s.story_id AND r.author_id = s.author_id AND r.status = 'completed'
      WHERE s.author_id = p.outcome_author AND s.created_at < :'cutoff'::timestamptz
        AND (r.run_id IS NOT NULL OR s.story_generation_status = 'completed')
      GROUP BY s.story_id, s.published_at
    ) completions
  ) story ON true
  LEFT JOIN LATERAL (
    SELECT min(coalesce(o.completed_at, ev.confirmed)) AS first_paid,
      bool_or(coalesce(o.completed_at, ev.confirmed) IS NULL) AS unknown_paid
    FROM payment_orders o
    LEFT JOIN LATERAL (SELECT min(created_at) AS confirmed FROM payment_events e
      WHERE e.order_id = o.order_id AND e.event_type = 'payment_completed') ev ON true
    WHERE o.author_id = p.outcome_author AND (o.status = 'completed' OR o.completed_at IS NOT NULL)
      AND (CASE WHEN jsonb_typeof(o.metadata #> '{stripe,amountTotal}') = 'number'
        THEN (o.metadata #>> '{stripe,amountTotal}')::numeric ELSE o.amount END) > 0
      AND o.created_at < :'cutoff'::timestamptz
      AND coalesce(o.metadata #>> '{stripe,livemode}', 'true') <> 'false'
      AND NOT EXISTS (
        SELECT 1 FROM payment_events e WHERE e.order_id = o.order_id AND e.event_type = 'webhook_received'
          AND e.data #>> '{session,livemode}' = 'false'
      )
  ) paid ON true
), totals AS (
  SELECT experiment_id, arm, count(*) AS assigned,
    count(*) FILTER (WHERE revoked_at IS NOT NULL) AS withdrawn,
    count(*) FILTER (WHERE author_id IS NULL AND revoked_at IS NULL) AS unlinked,
    count(*) FILTER (WHERE author_id IS NOT NULL AND author_rank > 1) AS additional_browsers,
    count(*) FILTER (WHERE mature7) AS mature_d7, count(*) FILTER (WHERE mature30) AS mature_d30,
    count(*) FILTER (WHERE mature7 AND unknown_done) AS unknown_first_story,
    count(*) FILTER (WHERE mature30 AND unknown_paid) AS unknown_first_payment,
    count(*) FILTER (WHERE mature7 AND NOT coalesce(unknown_done,false)
      AND first_done >= assigned_at AND first_done < assigned_at + interval '7 days') AS first_stories,
    count(*) FILTER (WHERE mature30 AND NOT coalesce(unknown_paid,false)
      AND first_paid >= assigned_at AND first_paid < assigned_at + interval '30 days') AS first_buyers,
    count(*) FILTER (WHERE mature7 AND reader_started_at < assigned_at + interval '7 days') AS readers,
    count(*) FILTER (WHERE mature7 AND reader_ended_at < assigned_at + interval '7 days') AS reader_ends
  FROM observed GROUP BY experiment_id, arm
), costs AS (
  SELECT p.experiment_id, p.arm, sum(u.estimated_cost_in_euros) AS measured_spend_eur,
    count(DISTINCT u.story_id) AS stories_with_cost
  FROM participants p JOIN stories s ON s.author_id = p.outcome_author
  JOIN workflow_usage u ON u.story_id = s.story_id::text
    AND u.created_at >= p.assigned_at AND u.created_at < p.assigned_at + interval '7 days'
  WHERE p.mature7 GROUP BY p.experiment_id, p.arm
), latencies AS (
  SELECT p.experiment_id, p.arm, count(*) AS runs,
    count(r.terminal_at) FILTER (WHERE r.terminal_at <= p.assigned_at + interval '7 days') AS timed_runs,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY extract(epoch FROM r.terminal_at - r.created_at))
      FILTER (WHERE r.terminal_at <= p.assigned_at + interval '7 days') AS p95_seconds
  FROM participants p JOIN story_generation_requests r ON r.author_id = p.outcome_author
    AND r.created_at >= p.assigned_at AND r.created_at < p.assigned_at + interval '7 days'
  WHERE p.mature7 GROUP BY p.experiment_id, p.arm
), rates AS (
  SELECT t.*, 100.0*first_stories/nullif(mature_d7,0) AS d7_pct,
    100.0*first_buyers/nullif(mature_d30,0) AS d30_pct,
    100.0*reader_ends/nullif(readers,0) AS reader_end_pct
  FROM totals t
)
SELECT :'cutoff'::timestamptz AS observation_cutoff_utc, v.*,
  CASE WHEN v.arm = 'treatment' THEN v.d7_pct - c.d7_pct END AS delta_d7_pp,
  CASE WHEN v.arm = 'treatment' THEN v.d30_pct - c.d30_pct END AS delta_d30_pp,
  coalesce(l.runs,0) AS generation_runs, coalesce(l.timed_runs,0) AS timed_runs, l.p95_seconds,
  coalesce(k.stories_with_cost,0) AS stories_with_cost, k.measured_spend_eur
FROM rates v LEFT JOIN rates c ON c.experiment_id = v.experiment_id AND c.arm = 'control'
LEFT JOIN costs k ON k.experiment_id = v.experiment_id AND k.arm = v.arm
LEFT JOIN latencies l ON l.experiment_id = v.experiment_id AND l.arm = v.arm
ORDER BY v.experiment_id, v.arm;
COMMIT;
