-- =====================================================================================
-- Mythoria Database Performance Optimization - Index Creation Script
-- Created: 2025-06-25
-- Purpose: Add missing database indexes to improve query performance
-- 
-- Instructions:
-- 1. Connect to your PostgreSQL database
-- 2. Execute this script as a superuser or database owner
-- 3. Monitor the progress - CONCURRENTLY indexes can take time on large tables
-- 4. Verify indexes were created successfully
--
-- NOTE: Execute each CREATE INDEX statement individually or in small batches
-- =====================================================================================

-- =====================================================================================
-- STORIES TABLE INDEXES
-- =====================================================================================

-- Index for story count queries (homepage feature)
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_status_idx 
    ON stories(status);

-- Composite index for story count with time filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_status_created_at_idx 
    ON stories(status, created_at);

-- Index for "My Stories" queries - most common pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_author_id_updated_at_idx 
    ON stories(author_id, updated_at DESC);

-- Index for author's stories by creation date
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_author_id_created_at_idx 
    ON stories(author_id, created_at DESC);

-- Index for filtering author's stories by status
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_author_id_status_idx 
    ON stories(author_id, status);

-- Index for public story gallery
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_is_public_idx 
    ON stories(is_public) WHERE is_public = true;

-- Index for featured stories
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_is_featured_idx 
    ON stories(is_featured) WHERE is_featured = true;

-- Index for story sharing by slug
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_slug_idx 
    ON stories(slug) WHERE slug IS NOT NULL;

-- Index for story generation status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_generation_status_idx 
    ON stories(story_generation_status);

-- =====================================================================================
-- TOKEN USAGE TRACKING INDEXES
-- =====================================================================================

-- Index for story-specific token usage queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_story_id_idx 
    ON token_usage_tracking(story_id);

-- Index for author-specific token usage queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_author_id_idx 
    ON token_usage_tracking(author_id);

-- Index for time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_created_at_idx 
    ON token_usage_tracking(created_at DESC);

-- Composite index for author usage over time
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_author_id_created_at_idx 
    ON token_usage_tracking(author_id, created_at DESC);

-- Index for action-based analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_action_idx 
    ON token_usage_tracking(action);

-- Index for AI model analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_ai_model_idx 
    ON token_usage_tracking(ai_model);

-- Composite index for action analytics by author
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_author_action_idx 
    ON token_usage_tracking(author_id, action);

-- =====================================================================================
-- STORY GENERATION RUNS INDEXES
-- =====================================================================================

-- Index for story-specific generation runs
CREATE INDEX CONCURRENTLY IF NOT EXISTS story_gen_runs_story_id_idx 
    ON story_generation_runs(story_id);

-- Index for status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS story_gen_runs_status_idx 
    ON story_generation_runs(status);

-- Composite index for story status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS story_gen_runs_story_id_status_idx 
    ON story_generation_runs(story_id, status);

-- Index for time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS story_gen_runs_created_at_idx 
    ON story_generation_runs(created_at DESC);

-- Index for active runs monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS story_gen_runs_active_idx 
    ON story_generation_runs(status, started_at) WHERE status IN ('queued', 'running');

-- =====================================================================================
-- CREDIT LEDGER INDEXES
-- =====================================================================================

-- Index for author credit balance calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_ledger_author_id_idx 
    ON credit_ledger(author_id);

-- Composite index for author credit history
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_ledger_author_id_created_at_idx 
    ON credit_ledger(author_id, created_at DESC);

-- Index for credit event type analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_ledger_event_type_idx 
    ON credit_ledger(credit_event_type);

-- Index for time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_ledger_created_at_idx 
    ON credit_ledger(created_at DESC);

-- Index for story-related credit events
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_ledger_story_id_idx 
    ON credit_ledger(story_id) WHERE story_id IS NOT NULL;

-- =====================================================================================
-- AUTHORS TABLE INDEXES
-- =====================================================================================

-- Index for Clerk user lookups (if not already unique index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS authors_clerk_user_id_idx 
    ON authors(clerk_user_id);

-- Index for email lookups (if not already unique index)  
CREATE INDEX CONCURRENTLY IF NOT EXISTS authors_email_idx 
    ON authors(email);

-- Index for last login analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS authors_last_login_at_idx 
    ON authors(last_login_at DESC) WHERE last_login_at IS NOT NULL;

-- Index for registration analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS authors_created_at_idx 
    ON authors(created_at DESC);

-- =====================================================================================
-- PAYMENT RELATED INDEXES
-- =====================================================================================

-- Payment methods indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS payment_methods_author_id_idx 
    ON payment_methods(author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS payment_methods_provider_idx 
    ON payment_methods(provider);

CREATE INDEX CONCURRENTLY IF NOT EXISTS payment_methods_is_default_idx 
    ON payment_methods(author_id, is_default) WHERE is_default = true;

-- Payments indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_author_id_idx 
    ON payments(author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_status_idx 
    ON payments(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_created_at_idx 
    ON payments(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_author_id_created_at_idx 
    ON payments(author_id, created_at DESC);

-- =====================================================================================
-- AI EDITS INDEXES (execute only if ai_edits table exists)
-- =====================================================================================

-- Uncomment these lines only if your ai_edits table exists:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_edits_author_id_idx ON ai_edits(author_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_edits_action_idx ON ai_edits(action);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_edits_author_action_idx ON ai_edits(author_id, action);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_edits_requested_at_idx ON ai_edits(requested_at DESC);

-- =====================================================================================
-- CHARACTERS INDEXES (execute only if characters table exists)
-- =====================================================================================

-- Uncomment these lines only if your characters table exists:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS characters_author_id_idx ON characters(author_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS characters_created_at_idx ON characters(created_at DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS characters_role_idx ON characters(role);

-- =====================================================================================
-- STORY RELATIONSHIPS INDEXES (execute only if these tables exist)
-- =====================================================================================

-- Story characters junction table (uncomment if table exists):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS story_characters_character_id_idx ON story_characters(character_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS story_characters_story_id_idx ON story_characters(story_id);

-- Share links indexes (uncomment if table exists):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS share_links_story_id_idx ON share_links(story_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS share_links_expires_at_idx ON share_links(expires_at);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS share_links_active_idx ON share_links(story_id, expires_at) WHERE revoked = false;

-- Story collaborators indexes (uncomment if table exists):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS story_collaborators_user_id_idx ON story_collaborators(user_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS story_collaborators_story_id_idx ON story_collaborators(story_id);

-- =====================================================================================
-- ADDITIONAL UTILITY INDEXES (execute only if these tables exist)
-- =====================================================================================

-- Story versions for version history (uncomment if table exists):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS story_versions_story_id_version_idx ON story_versions(story_id, version_number DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS story_versions_created_at_idx ON story_versions(created_at DESC);

-- Addresses indexes (uncomment if table exists):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS addresses_author_id_idx ON addresses(author_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS addresses_type_idx ON addresses(type);

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Query to verify some of the key indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE '%_idx' 
    AND tablename IN ('stories', 'token_usage_tracking', 'credit_ledger', 'story_generation_runs')
ORDER BY tablename, indexname;

-- =====================================================================================
-- PERFORMANCE NOTES
-- =====================================================================================

/*
PERFORMANCE IMPACT:

1. Stories table indexes will dramatically improve:
   - Homepage story count queries
   - "My Stories" page loading
   - Story sharing and public gallery
   - Author dashboard performance

2. Token usage indexes will improve:
   - Cost calculation queries
   - Usage analytics and reporting
   - Author usage history

3. Credit ledger indexes will improve:
   - Credit balance calculations
   - Transaction history queries
   - Credit usage analytics

4. Story generation run indexes will improve:
   - Workflow status monitoring
   - Generation progress tracking
   - Error analysis queries

MAINTENANCE:
- These indexes will be automatically maintained by PostgreSQL
- Consider running ANALYZE on these tables after index creation
- Monitor index usage with pg_stat_user_indexes
- Consider index-only scans for frequently accessed columns

NEXT STEPS:
1. Run ANALYZE on affected tables
2. Monitor query performance improvements
3. Consider implementing query result caching for frequently accessed data
4. Review slow query logs to identify any remaining optimization opportunities
*/
