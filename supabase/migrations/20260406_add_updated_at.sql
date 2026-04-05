
-- 프로필 테이블에 업데이트 일시(updated_at) 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
