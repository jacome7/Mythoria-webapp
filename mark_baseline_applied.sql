-- Mark the consolidated baseline migration as applied
-- Since all tables/enums already exist from the restored backup
INSERT INTO drizzle_migrations (hash, created_at) 
VALUES (
  (SELECT md5('0000_consolidated_baseline')), 
  EXTRACT(EPOCH FROM NOW()) * 1000
)
ON CONFLICT (hash) DO NOTHING;
