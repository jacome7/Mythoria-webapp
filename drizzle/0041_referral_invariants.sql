-- Database-owned invariants; intentionally custom because Drizzle cannot model triggers.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE referral_terms_versions ADD CONSTRAINT referral_terms_no_overlap
EXCLUDE USING gist (referral_owner_id WITH =, tstzrange(effective_from,effective_until,'[)') WITH &&);
--> statement-breakpoint
CREATE FUNCTION referral_reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable referral record: %', TG_TABLE_NAME USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE TRIGGER referral_ledger_immutable BEFORE UPDATE OR DELETE ON referral_commission_events FOR EACH ROW EXECUTE FUNCTION referral_reject_mutation();
CREATE TRIGGER referral_audit_immutable BEFORE UPDATE OR DELETE ON referral_audit_events FOR EACH ROW EXECUTE FUNCTION referral_reject_mutation();
CREATE TRIGGER referral_snapshot_immutable BEFORE UPDATE OR DELETE ON payment_order_referral_snapshots FOR EACH ROW EXECUTE FUNCTION referral_reject_mutation();
CREATE TRIGGER referral_story_snapshot_immutable BEFORE UPDATE OF referral_assignment_id,referral_owner_id,referral_code_snapshot ON stories FOR EACH ROW WHEN (OLD.referral_assignment_id IS DISTINCT FROM NEW.referral_assignment_id OR OLD.referral_owner_id IS DISTINCT FROM NEW.referral_owner_id OR OLD.referral_code_snapshot IS DISTINCT FROM NEW.referral_code_snapshot) EXECUTE FUNCTION referral_reject_mutation();
CREATE TRIGGER referral_terms_values_immutable BEFORE UPDATE ON referral_terms_versions FOR EACH ROW WHEN (OLD.referral_owner_id IS DISTINCT FROM NEW.referral_owner_id OR OLD.commission_rate_bps IS DISTINCT FROM NEW.commission_rate_bps OR OLD.effective_from IS DISTINCT FROM NEW.effective_from OR OLD.program_policy_version IS DISTINCT FROM NEW.program_policy_version) EXECUTE FUNCTION referral_reject_mutation();
CREATE TRIGGER referral_settlement_item_amount_immutable BEFORE UPDATE ON referral_settlement_items FOR EACH ROW WHEN (OLD.settlement_id IS DISTINCT FROM NEW.settlement_id OR OLD.commission_event_id IS DISTINCT FROM NEW.commission_event_id OR OLD.signed_amount_cents IS DISTINCT FROM NEW.signed_amount_cents) EXECUTE FUNCTION referral_reject_mutation();
--> statement-breakpoint
CREATE TABLE referral_code_reservations (code text PRIMARY KEY, namespace text NOT NULL, entity_id uuid NOT NULL);
INSERT INTO referral_code_reservations SELECT upper(trim(code)), 'promotion', promotion_code_id FROM promotion_codes;
INSERT INTO referral_code_reservations SELECT code, 'referral', referral_code_id FROM referral_codes;
--> statement-breakpoint
CREATE FUNCTION referral_reserve_code() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entity uuid; ns text; existing referral_code_reservations%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME='referral_codes' THEN entity:=NEW.referral_code_id; ns:='referral';
    IF TG_OP='UPDATE' AND OLD.first_visited_at IS NOT NULL AND (NEW.code<>OLD.code OR NEW.first_visited_at IS DISTINCT FROM OLD.first_visited_at) THEN
      RAISE EXCEPTION 'used referral code is immutable' USING ERRCODE='23514';
    END IF;
  ELSE entity:=NEW.promotion_code_id; ns:='promotion'; END IF;
  INSERT INTO referral_code_reservations VALUES (upper(trim(NEW.code)), ns, entity) ON CONFLICT DO NOTHING;
  SELECT * INTO existing FROM referral_code_reservations WHERE code=upper(trim(NEW.code));
  IF existing.namespace<>ns OR existing.entity_id<>entity THEN RAISE EXCEPTION 'code unavailable' USING ERRCODE='23505'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER referral_code_reservation BEFORE INSERT OR UPDATE ON referral_codes FOR EACH ROW EXECUTE FUNCTION referral_reserve_code();
CREATE TRIGGER promotion_code_reservation BEFORE INSERT OR UPDATE OF code ON promotion_codes FOR EACH ROW EXECUTE FUNCTION referral_reserve_code();
CREATE TRIGGER referral_code_no_delete BEFORE DELETE ON referral_codes FOR EACH ROW EXECUTE FUNCTION referral_reject_mutation();
--> statement-breakpoint
CREATE FUNCTION record_referral_story_event(story uuid, kind text, moment timestamptz) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF kind NOT IN ('story_started','story_generated','story_published') THEN RAISE EXCEPTION 'invalid referral funnel event'; END IF;
  INSERT INTO referral_funnel_events(referral_owner_id,assignment_id,customer_reference,event_type,dedupe_key,locale,country,occurred_at)
  SELECT s.referral_owner_id,s.referral_assignment_id,r.customer_reference,kind,kind||':'||story::text,a.preferred_locale,NULL,moment
  FROM stories s JOIN authors a USING(author_id)
  JOIN referral_customer_references r ON r.author_id=s.author_id AND r.referral_owner_id=s.referral_owner_id
  WHERE s.story_id=story AND s.referral_assignment_id IS NOT NULL
  ON CONFLICT(dedupe_key) DO NOTHING;
END $$;
--> statement-breakpoint
CREATE FUNCTION referral_story_funnel_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='story_generation_requests' THEN
    IF NEW.status='completed' THEN PERFORM record_referral_story_event(NEW.story_id,'story_generated',coalesce(NEW.terminal_at,now())); END IF;
  ELSE
    IF TG_OP='INSERT' THEN PERFORM record_referral_story_event(NEW.story_id,'story_started',NEW.created_at); END IF;
    IF NEW.published_at IS NOT NULL THEN PERFORM record_referral_story_event(NEW.story_id,'story_published',NEW.published_at); END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER referral_story_funnel AFTER INSERT OR UPDATE OF published_at ON stories FOR EACH ROW EXECUTE FUNCTION referral_story_funnel_trigger();
CREATE TRIGGER referral_generation_funnel AFTER INSERT OR UPDATE OF status ON story_generation_requests FOR EACH ROW EXECUTE FUNCTION referral_story_funnel_trigger();
--> statement-breakpoint
ALTER TABLE referral_commissions ADD CONSTRAINT referral_commission_amounts_check CHECK (
  currency='EUR' AND commission_rate_bps BETWEEN 0 AND 10000 AND
  gross_amount_cents>=0 AND commission_basis_cents=gross_amount_cents AND original_commission_cents>=0 AND
  refunded_gross_cents>=0 AND disputed_gross_cents>=0 AND reversed_cents>=0 AND reversed_cents<=original_commission_cents);
ALTER TABLE referral_settlements ADD CONSTRAINT referral_settlement_integrity CHECK (
  currency='EUR' AND status IN ('payable','paid','cancelled') AND period_start<period_end AND net_payment_cents>=2000 AND
  gross_commission_cents+adjustments_cents=net_payment_cents AND (status<>'paid' OR (paid_at IS NOT NULL AND length(trim(external_payment_reference))>0)));
--> statement-breakpoint
-- Retention is explicit and never an automatic destructive cascade. Legal holds override review dates.
COMMENT ON TABLE referral_commission_events IS 'Immutable financial archive. Retention review requires finance approval after 10 years and after legal holds expire; never delete through account deletion.';
