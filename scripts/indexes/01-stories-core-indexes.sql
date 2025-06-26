-- =====================================================================================
-- STORIES TABLE INDEXES - Critical for Homepage and My Stories Performance
-- Execute this script first as it addresses the most critical performance issues
-- =====================================================================================

-- Index for story count queries (homepage feature)
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_status_idx 
    ON stories(status);
