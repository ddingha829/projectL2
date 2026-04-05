
-- 1. 게시물 테이블에 조회수 컬럼 추가
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- 2. 사이트 전체 방문 통계를 위한 로그 테이블 (심플 버전)
CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_session_id TEXT, -- 브라우저 세션 등으로 구분 가능
  visited_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 익명 유저가 방문 로그를 남길 수 있도록 권한 설정
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert for all visitors" ON public.site_visits;
CREATE POLICY "Enable insert for all visitors" ON public.site_visits 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for admin only" ON public.site_visits;
CREATE POLICY "Enable read for admin only" ON public.site_visits 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. 게시물 조회수 증가를 위한 RPC 함수
CREATE OR REPLACE FUNCTION increment_post_views(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts 
  SET views = COALESCE(views, 0) + 1 
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
