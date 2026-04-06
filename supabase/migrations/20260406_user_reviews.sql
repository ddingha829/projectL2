-- Ensure pgcrypto is enabled for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- [주의] 기존 테이블이 있을 경우 삭제하고 새로 생성 (기존 데이터가 날아갈 수 있으니 주의)
DROP TABLE IF EXISTS public.user_reviews CASCADE;

-- Create user_reviews table
CREATE TABLE public.user_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index
CREATE INDEX idx_user_reviews_subject ON public.user_reviews(subject);

-- Set RLS policies
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Public reviews are viewable by everyone" ON public.user_reviews
    FOR SELECT USING (true);

-- Logged-in users can insert
CREATE POLICY "Authenticated users can insert reviews" ON public.user_reviews
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews, admins can delete any
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.user_reviews;
CREATE POLICY "Users can delete their own reviews" ON public.user_reviews
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ));
