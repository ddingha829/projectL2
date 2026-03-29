-- =====================================================
-- 히어로 카드 관리 기능을 위한 Supabase SQL 마이그레이션
-- =====================================================

-- 1. posts 테이블에 히어로 관련 컬럼 추가 (이미 있으면 오류 무시)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_hero      BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hero_at      TIMESTAMPTZ;

-- 히어로 지정된 게시물을 빠르게 조회하기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_is_hero ON posts(is_hero, hero_at);

-- 2. profiles 테이블에 role 컬럼 추가 (없는 경우)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- role 컬럼 제약: 허용값 설정 (선택)
-- ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'writer'));

-- 3. 특정 유저를 admin으로 설정하는 방법:
-- (Supabase 대시보드 SQL Editor 또는 로컬에서 실행)
-- 방법 A: 이메일로 찾아 설정
-- UPDATE profiles SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your-admin@email.com');
--
-- 방법 B: UUID로 직접 설정
-- UPDATE profiles SET role = 'admin' WHERE id = 'your-user-uuid-here';

-- 4. RLS 정책: 히어로 업데이트는 admin만 가능하도록 설정
-- (Supabase Row Level Security 설정)
-- CREATE POLICY "admin can update hero" ON posts
--   FOR UPDATE USING (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   );

-- 5. 현재 히어로 포스트 확인
-- SELECT id, title, is_hero, hero_at FROM posts WHERE is_hero = true ORDER BY hero_at DESC;
