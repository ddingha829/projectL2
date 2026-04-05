
-- 사용자별로 지정한 보기 형식을 저장하기 위한 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_view_type TEXT,
ADD COLUMN IF NOT EXISTS preferred_m_cols INTEGER,
ADD COLUMN IF NOT EXISTS preferred_d_cols INTEGER;
