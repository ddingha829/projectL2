-- =====================================================
-- role 체계 정리: user / admin / editor
-- writer 제거, editor 추가
-- =====================================================

-- 기존 제약 제거 후 새 허용값으로 재설정
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'editor'));

-- 기존 'writer' role을 'editor'로 마이그레이션
UPDATE profiles SET role = 'editor' WHERE role = 'writer';

-- =====================================================
-- 권한 정책 정리
-- admin : 글쓰기, 수정(전체), 삭제, 히어로 지정
-- editor: 글쓰기, 수정(본인 글만)
-- user  : 댓글, 좋아요만
-- =====================================================
-- (실제 권한 체크는 Next.js 서버 코드에서 처리)
