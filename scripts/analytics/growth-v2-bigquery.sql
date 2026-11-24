-- Replace PROJECT.DATASET with the explicit audit or production dataset in a local query copy.
-- Bind @from_date, @through_date and @v2_release_date (DATE) and @hostnames (ARRAY<STRING>).
-- Use daily exports only. Report the property timezone and allow the late arrival window to mature.
WITH scoped AS (
  SELECT event_date, event_name, user_id, privacy_info, event_params
  FROM `PROJECT.DATASET.events_*`
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', @from_date) AND FORMAT_DATE('%Y%m%d', @through_date)
    AND device.web_info.hostname IN UNNEST(@hostnames)
), rows AS (
  SELECT event_date, event_name, privacy_info.analytics_storage AS storage_consent,
    (SELECT MAX(p.value.int_value) FROM UNNEST(event_params) p WHERE p.key = 'schema_version') AS schema_version,
    (SELECT MAX(p.value.int_value) FROM UNNEST(event_params) p WHERE p.key = 'ga_session_id') AS session_id
  FROM scoped
)
SELECT event_date, event_name, storage_consent, schema_version, COUNT(*) AS events,
  @v2_release_date AS v2_release_date,
  COUNTIF(session_id IS NULL) AS missing_observed_session
FROM rows
WHERE event_name IN ('creation_outline_accepted', 'creation_input_retained', 'story_share_qualified_open', 'story_share_open',
  'sign_up', 'story_generation_requested', 'story_generation_completed', 'purchase', 'refund')
GROUP BY 1, 2, 3, 4 ORDER BY 1, 2, 3, 4;
