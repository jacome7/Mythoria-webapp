-- 0021_self_print_credit_event.sql
-- Adds `selfPrinting` credit_event_type value for self-print deductions

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'credit_event_type' AND e.enumlabel = 'selfPrinting'
    ) THEN
        ALTER TYPE "credit_event_type" ADD VALUE 'selfPrinting';
    END IF;
END
$$;
