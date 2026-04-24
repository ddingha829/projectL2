-- post_reviews 테이블에 address와 category 컬럼 추가
ALTER TABLE public.post_reviews ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.post_reviews ADD COLUMN IF NOT EXISTS category TEXT;
