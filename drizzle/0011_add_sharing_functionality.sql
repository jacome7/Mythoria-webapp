-- Migration to add sharing functionality to stories
-- Add new columns to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Create index for slug lookup
CREATE INDEX IF NOT EXISTS stories_slug_idx ON stories(slug) WHERE slug IS NOT NULL;

-- Create share_links table
CREATE TABLE IF NOT EXISTS share_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id uuid NOT NULL REFERENCES stories(story_id) ON DELETE CASCADE,
    access_level text NOT NULL CHECK (access_level IN ('view', 'edit')),
    expires_at timestamp with time zone DEFAULT (NOW() + INTERVAL '30 days'),
    revoked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS share_links_story_id_idx ON share_links(story_id);
CREATE INDEX IF NOT EXISTS share_links_expires_at_idx ON share_links(expires_at);
CREATE INDEX IF NOT EXISTS share_links_revoked_idx ON share_links(revoked);

-- Create story_collaborators table
CREATE TABLE IF NOT EXISTS story_collaborators (
    story_id uuid NOT NULL REFERENCES stories(story_id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES authors(author_id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('editor', 'viewer')),
    created_at timestamp with time zone DEFAULT NOW(),
    PRIMARY KEY (story_id, user_id)
);

-- Create index for efficient collaborator lookups
CREATE INDEX IF NOT EXISTS story_collaborators_user_id_idx ON story_collaborators(user_id);