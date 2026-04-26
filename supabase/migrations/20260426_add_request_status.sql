-- review_requests 테이블에 status 컬럼 추가
ALTER TABLE public.review_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'; -- 'pending', 'writing', 'completed', 'canceled'

-- 기존 데이터 마이그레이션 (답변이 있으면 completed)
UPDATE public.review_requests SET status = 'completed' WHERE reply IS NOT NULL;
