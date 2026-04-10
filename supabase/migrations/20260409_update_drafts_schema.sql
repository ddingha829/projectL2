-- drafts 테이블에 누락된 컬럼들을 추가하여 posts 테이블과 스키마를 맞춥니다.
ALTER TABLE public.drafts 
  ADD COLUMN IF NOT EXISTS is_feature BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_main_image BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS review_subject TEXT,
  ADD COLUMN IF NOT EXISTS review_rating INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_comment TEXT;

-- 권한 설정 (필요한 경우)
GRANT ALL ON TABLE public.drafts TO authenticated;
GRANT ALL ON TABLE public.drafts TO service_role;
