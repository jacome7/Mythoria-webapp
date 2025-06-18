-- Create story_rating enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE story_rating AS ENUM ('1', '2', '3', '4', '5');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create story_ratings table
CREATE TABLE IF NOT EXISTS story_ratings (
    rating_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL,
    user_id UUID, -- Optional - for anonymous ratings
    rating story_rating NOT NULL,
    feedback TEXT,
    is_anonymous BOOLEAN DEFAULT true NOT NULL,
    include_name_in_feedback BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Foreign key constraints
    CONSTRAINT story_ratings_story_id_fk 
        FOREIGN KEY (story_id) REFERENCES stories(story_id) ON DELETE CASCADE,
    CONSTRAINT story_ratings_user_id_fk 
        FOREIGN KEY (user_id) REFERENCES authors(author_id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_story_ratings_story_id ON story_ratings(story_id);
CREATE INDEX IF NOT EXISTS idx_story_ratings_user_id ON story_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_story_ratings_created_at ON story_ratings(created_at);

COMMENT ON TABLE story_ratings IS 'Stores user ratings and feedback for stories';
COMMENT ON COLUMN story_ratings.rating_id IS 'Primary key for the rating';
COMMENT ON COLUMN story_ratings.story_id IS 'References the story being rated';
COMMENT ON COLUMN story_ratings.user_id IS 'References the user who provided the rating (nullable for anonymous ratings)';
COMMENT ON COLUMN story_ratings.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN story_ratings.feedback IS 'Optional textual feedback from the user';
COMMENT ON COLUMN story_ratings.is_anonymous IS 'Whether the rating should be treated as anonymous';
COMMENT ON COLUMN story_ratings.include_name_in_feedback IS 'Whether to include the user name with the feedback to the author';
COMMENT ON COLUMN story_ratings.created_at IS 'Timestamp when the rating was created';
