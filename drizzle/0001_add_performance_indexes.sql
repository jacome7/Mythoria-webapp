-- Performance optimization indexes migration
-- Created: 2025-06-25
-- Purpose: Add missing database indexes to improve query performance

-- Stories table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_status_idx ON stories(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_status_created_at_idx ON stories(status, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_author_id_updated_at_idx ON stories(author_id, updated_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_author_id_created_at_idx ON stories(author_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_author_id_status_idx ON stories(author_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_is_public_idx ON stories(is_public);
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_is_featured_idx ON stories(is_featured);
CREATE INDEX CONCURRENTLY IF NOT EXISTS stories_slug_idx ON stories(slug);

-- Token usage tracking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_story_id_idx ON token_usage_tracking(story_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_author_id_idx ON token_usage_tracking(author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_created_at_idx ON token_usage_tracking(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_author_id_created_at_idx ON token_usage_tracking(author_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_action_idx ON token_usage_tracking(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS token_usage_ai_model_idx ON token_usage_tracking(ai_model);

-- Story generation runs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS story_gen_runs_story_id_idx ON story_generation_runs(story_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS story_gen_runs_status_idx ON story_generation_runs(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS story_gen_runs_story_id_status_idx ON story_generation_runs(story_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS story_gen_runs_created_at_idx ON story_generation_runs(created_at);

-- Credit ledger indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_ledger_author_id_idx ON credit_ledger(author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_ledger_author_id_created_at_idx ON credit_ledger(author_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_ledger_event_type_idx ON credit_ledger(credit_event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_ledger_created_at_idx ON credit_ledger(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_ledger_story_id_idx ON credit_ledger(story_id);

-- Payment methods indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS payment_methods_author_id_idx ON payment_methods(author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS payment_methods_provider_idx ON payment_methods(provider);
CREATE INDEX CONCURRENTLY IF NOT EXISTS payment_methods_is_default_idx ON payment_methods(is_default);

-- Payments indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_author_id_idx ON payments(author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_status_idx ON payments(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_created_at_idx ON payments(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_author_id_created_at_idx ON payments(author_id, created_at);

-- AI edits indexes (if table exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_edits_author_id_idx ON ai_edits(author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_edits_action_idx ON ai_edits(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_edits_author_action_idx ON ai_edits(author_id, action);

-- Print requests indexes (if table exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS print_requests_author_id_idx ON print_requests(author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS print_requests_status_idx ON print_requests(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS print_requests_requested_at_idx ON print_requests(requested_at);

-- Story characters junction table index
CREATE INDEX CONCURRENTLY IF NOT EXISTS story_characters_character_id_idx ON story_characters(character_id);

-- Characters indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS characters_author_id_idx ON characters(author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS characters_created_at_idx ON characters(created_at);

-- Share links indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS share_links_story_id_idx ON share_links(story_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS share_links_expires_at_idx ON share_links(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS share_links_revoked_idx ON share_links(revoked);

-- Story collaborators indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS story_collaborators_user_id_idx ON story_collaborators(user_id);

-- Authors table optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS authors_clerk_user_id_idx ON authors(clerk_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS authors_email_idx ON authors(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS authors_last_login_at_idx ON authors(last_login_at);

-- Addresses indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS addresses_author_id_idx ON addresses(author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS addresses_type_idx ON addresses(type);

-- Events indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS events_author_id_idx ON events(author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS events_event_type_idx ON events(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS events_created_at_idx ON events(created_at);
