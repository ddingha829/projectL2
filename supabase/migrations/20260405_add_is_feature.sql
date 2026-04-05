-- Add 'is_feature' column to the 'posts' table to distinguish special feature articles.
-- This allows us to fetch and display banner-style cards on the homepage.

ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS is_feature BOOLEAN NOT NULL DEFAULT false;

-- Add index for performance in the home content fetch
CREATE INDEX IF NOT EXISTS idx_posts_is_feature ON public.posts(is_feature);
