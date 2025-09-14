-- 0020_promotion_codes.sql
-- Adds promotion_codes and promotion_code_redemptions tables
-- Simple initial implementation (partner codes only) – future referral / book_qr reuse.

CREATE TABLE IF NOT EXISTS promotion_codes (
  promotion_code_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(64) NOT NULL UNIQUE,
  type varchar(20) NOT NULL DEFAULT 'partner',
  credit_amount integer NOT NULL,
  max_global_redemptions integer,
  max_redemptions_per_user integer NOT NULL DEFAULT 1,
  valid_from timestamptz,
  valid_until timestamptz,
  referrer_author_id uuid REFERENCES authors(author_id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS promotion_codes_code_idx ON promotion_codes(code);

CREATE TABLE IF NOT EXISTS promotion_code_redemptions (
  promotion_code_redemption_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_code_id uuid NOT NULL REFERENCES promotion_codes(promotion_code_id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES authors(author_id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  credits_granted integer NOT NULL,
  credit_ledger_entry_id uuid,
  CONSTRAINT promotion_code_redemptions_unique_once UNIQUE (promotion_code_id, author_id)
);

CREATE INDEX IF NOT EXISTS promotion_code_redemptions_code_idx ON promotion_code_redemptions(promotion_code_id);
CREATE INDEX IF NOT EXISTS promotion_code_redemptions_author_idx ON promotion_code_redemptions(author_id);

-- Helper trigger to keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_promotion_codes_updated_at ON promotion_codes;
CREATE TRIGGER trg_promotion_codes_updated_at
BEFORE UPDATE ON promotion_codes
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at_timestamp();

-- End of migration
