-- =====================================================
-- profiles 테이블에 email 컬럼 추가 + 자동 동기화 트리거
-- =====================================================

-- 1. profiles 테이블에 email 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. 신규 가입자 트리거 함수 (이미 있으면 교체)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 트리거 등록 (기존 트리거 제거 후 재생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. 기존 유저 이메일 일괄 동기화
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;
