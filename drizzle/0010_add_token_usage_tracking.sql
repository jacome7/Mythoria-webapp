-- Create enum for AI action types if it doesn't exist
DO $$ BEGIN
    CREATE TYPE ai_action_type AS ENUM(
        'story_structure',
        'story_outline', 
        'chapter_writing',
        'image_generation',
        'story_review',
        'character_generation',
        'story_enhancement',
        'audio_generation',
        'content_validation'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create token usage tracking table
CREATE TABLE IF NOT EXISTS token_usage_tracking (
    token_usage_id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid NOT NULL,
    story_id uuid NOT NULL,
    action ai_action_type NOT NULL,
    ai_model varchar(100) NOT NULL,
    input_tokens integer NOT NULL,
    output_tokens integer NOT NULL,
    estimated_cost_in_euros numeric(10, 6) NOT NULL,
    input_prompt_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index for performance on common queries
CREATE INDEX IF NOT EXISTS idx_token_usage_author_id ON token_usage_tracking(author_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_story_id ON token_usage_tracking(story_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_action ON token_usage_tracking(action);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage_tracking(created_at);
