-- [ Plan C ] 모든 티끌플레이스 카드를 개별 데이터화 하기 위한 테이블 생성
CREATE TABLE IF NOT EXISTS public.post_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    rating NUMERIC NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 추가 (빠른 아카이브 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_post_reviews_subject ON public.post_reviews(subject);
CREATE INDEX IF NOT EXISTS idx_post_reviews_post_id ON public.post_reviews(post_id);

-- 신규 컬럼 확장 (아카이브 지도를 위한 좌표 정보)
ALTER TABLE public.post_reviews ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE public.post_reviews ADD COLUMN IF NOT EXISTS lng NUMERIC;
ALTER TABLE public.post_reviews ADD COLUMN IF NOT EXISTS embed_url TEXT;
ALTER TABLE public.post_reviews ADD COLUMN IF NOT EXISTS place_id TEXT;

-- RLS 설정
ALTER TABLE public.post_reviews ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (충돌 방지를 위해 DROP 후 다시 생성하거나 생성 시점에 체크)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Post reviews are viewable by everyone') THEN
        CREATE POLICY "Post reviews are viewable by everyone" ON public.post_reviews
            FOR SELECT USING (true);
    END IF;
END
$$;

-- 에디터/관리자만 삽입/삭제 가능 (게시물 수정 시 동기화용)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Editors can manage post reviews') THEN
        CREATE POLICY "Editors can manage post reviews" ON public.post_reviews
            FOR ALL TO authenticated
            USING (EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND (role = 'admin' OR role = 'editor')
            ));
    END IF;
END
$$;

-- 유저 평점 데이터 다이어트 (기존 10점 -> 5점)
UPDATE public.user_reviews SET rating = rating / 2.0 WHERE rating > 5.0;
