-- Seed pricing row for the self-printing service so credits can be deducted consistently
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pricing WHERE service_code = 'selfPrinting') THEN
        INSERT INTO pricing (id, service_code, credits, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), 'selfPrinting', 4, TRUE, now(), now());
    END IF;
END $$;
