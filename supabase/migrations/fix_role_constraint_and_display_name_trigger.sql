-- =====================================================
-- 1. role 제약 조건 수정: 'editor' 허용 추가
-- =====================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'writer', 'editor'));

-- =====================================================
-- 2. 트리거 함수 수정: full_name 키로 닉네임 읽기
--    (가입 시 options.data.full_name 으로 저장하므로)
-- =====================================================
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
    display_name = COALESCE(
      EXCLUDED.display_name,
      profiles.display_name
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. 기존 유저 닉네임 동기화
--    (display_name이 비어있는 기존 가입자 대상)
-- =====================================================
UPDATE public.profiles p
SET display_name = COALESCE(
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'display_name',
  split_part(u.email, '@', 1)
)
FROM auth.users u
WHERE p.id = u.id
  AND (p.display_name IS NULL OR p.display_name = '');

-- NOTE: 이 파일은 기록용입니다.
-- Supabase에 적용하려면 대시보드 → SQL Editor에서 직접 실행하세요.
-- Supabase CLI + supabase db push 사용 시에만 자동 적용됩니다.
