CREATE FUNCTION normalize_signup_outbox_identity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF left(NEW.dedupe_key, 8) = 'sign_up:'
    AND NEW.dedupe_key !~ '^sign_up:sha256:[0-9a-f]{64}$' THEN
    NEW.dedupe_key := 'sign_up:sha256:' ||
      encode(sha256(convert_to(NEW.dedupe_key, 'UTF8')), 'hex');
  END IF;
  NEW.user_id := NULL;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
-- Normalize older writers before the unique-key check, including during rollback.
CREATE TRIGGER analytics_outbox_signup_identity
BEFORE INSERT OR UPDATE OF dedupe_key, user_id, event_name ON analytics_outbox
FOR EACH ROW WHEN (NEW.event_name = 'sign_up')
EXECUTE FUNCTION normalize_signup_outbox_identity();
--> statement-breakpoint
-- The trigger rewrites legacy keys in place while preserving each row's delivery state.
UPDATE analytics_outbox
SET user_id = NULL
WHERE event_name = 'sign_up'
  AND (user_id IS NOT NULL OR (
    left(dedupe_key, 8) = 'sign_up:' AND dedupe_key !~ '^sign_up:sha256:[0-9a-f]{64}$'
  ));
