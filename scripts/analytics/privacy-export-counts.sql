-- Replace PROJECT.DATASET with the explicit destination in a local query copy.
-- Bind @from_date and @through_date (DATE), and @synthetic_sentinels (ARRAY<STRING>, empty for historical scans).
-- Output is counts only. Detection of historical shapes is a lower bound and requires restricted owner review.
WITH fields AS (
  SELECT event_date, 'user_id' AS field, user_id AS value
  FROM `PROJECT.DATASET.events_*`
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', @from_date) AND FORMAT_DATE('%Y%m%d', @through_date)
  UNION ALL
  SELECT event_date, p.key, p.value.string_value
  FROM `PROJECT.DATASET.events_*`, UNNEST(event_params) p
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', @from_date) AND FORMAT_DATE('%Y%m%d', @through_date)
    AND p.value.string_value IS NOT NULL
)
SELECT event_date, field,
  COUNT(*) AS scanned_values,
  COUNTIF(REGEXP_CONTAINS(IFNULL(value, ''), r'(?i)(?:/|%2f|%252f)(?:s|survey|biographer(?:/|%2f|%252f)(?:invite|resume|contribution))(?:/|%2f|%252f)[a-f0-9-]{20,}')) AS credential_path_candidates,
  COUNTIF(field = 'user_id' AND REGEXP_CONTAINS(IFNULL(value, ''), r'^user_[a-zA-Z0-9]+$')) AS raw_auth_id_candidates,
  COUNTIF(EXISTS(SELECT 1 FROM UNNEST(@synthetic_sentinels) sentinel WHERE sentinel != '' AND STRPOS(IFNULL(value, ''), sentinel) > 0)) AS synthetic_matches
FROM fields GROUP BY 1, 2 ORDER BY 1, 2;
