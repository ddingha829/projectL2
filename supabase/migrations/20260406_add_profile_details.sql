
-- 프로필 테이블에 에디터 정보를 위한 추가 컬럼 구성
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#204bb8',
ADD COLUMN IF NOT EXISTS bullets TEXT[] DEFAULT '{}';

-- 기존 유저들에게 기본값 적용 (필요 시)
UPDATE public.profiles SET bullets = '{}' WHERE bullets IS NULL;
