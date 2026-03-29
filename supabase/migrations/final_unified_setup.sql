-- =====================================================
-- [최종 통합 마이그레이션] 권한 설정, 닉네임 동기화, 히어로 기능
-- =====================================================

-- 1. 게시물 테이블 히어로 기능 추가
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS is_hero BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hero_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_posts_is_hero ON public.posts(is_hero, hero_at);

-- 2. 프로필 테이블 권한 및 이메일 설정
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- writer를 editor로 통합 마이그레이션
UPDATE public.profiles SET role = 'editor' WHERE role = 'writer';

-- role 제약 조건을 user, admin, editor로만 한정
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'admin', 'editor'));

-- 3. 가입 시 프로필 자동 생성 및 닉네임(full_name) 연동 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. 이미지 저장소(Storage) 권한 설정
-- post-images 라는 퍼블릭 버킷이 있어야 합니다.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- 에디터/관리자만 이미지를 올릴 수 있는 정책
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-images' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'editor')
  )
);

-- 가입만 되어 있고 닉네임이나 이메일 컬럼이 빈 기존 유저 일괄 업데이트
UPDATE public.profiles p
SET
  email = u.email,
  display_name = COALESCE(
    NULLIF(p.display_name, ''),
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'display_name',
    split_part(u.email, '@', 1)
  )
FROM auth.users u
WHERE p.id = u.id;
