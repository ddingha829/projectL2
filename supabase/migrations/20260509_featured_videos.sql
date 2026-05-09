-- featured_media 통합 미디어 테이블
-- YouTube (롱폼/숏츠) + Instagram 게시물을 통합 관리
-- 이전 featured_videos 테이블 대체

-- 기존 테이블이 있으면 삭제 (아직 미적용이므로 안전)
DROP TABLE IF EXISTS featured_videos CASCADE;

CREATE TABLE IF NOT EXISTS featured_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,                       -- YouTube URL 또는 Instagram 게시물 URL
  title TEXT,                              -- 표시 제목
  caption TEXT,                            -- 캡션 (인스타그램 내용 등)
  media_type TEXT NOT NULL DEFAULT 'youtube_long'
    CHECK (media_type IN ('youtube_long', 'youtube_short', 'instagram')),
  thumbnail_url TEXT,                      -- 썸네일 이미지 URL (인스타 필수, YouTube 자동)
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 정책
ALTER TABLE featured_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active featured media"
  ON featured_media FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage featured media"
  ON featured_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_featured_media_order
  ON featured_media(display_order ASC, created_at DESC);
