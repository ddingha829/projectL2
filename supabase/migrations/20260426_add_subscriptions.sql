-- subscriptions 테이블 생성
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(subscriber_id, author_id)
);

-- RLS 설정
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = subscriber_id);

DROP POLICY IF EXISTS "Authenticated users can manage their own subscriptions" ON public.subscriptions;
CREATE POLICY "Authenticated users can manage their own subscriptions" ON public.subscriptions
    FOR ALL USING (auth.uid() = subscriber_id);

-- 알림 연동: 에디터가 새 글을 쓰면 구독자에게 알림 발송
CREATE OR REPLACE FUNCTION public.handle_new_post_subscription_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- 구독자들에게 알림 삽입
    INSERT INTO public.notifications (receiver_id, sender_id, type, post_id, content_preview)
    SELECT subscriber_id, NEW.author_id, 'new_post_subscription', NEW.id, LEFT(NEW.title, 50)
    FROM public.subscriptions
    WHERE author_id = NEW.author_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_post_subscription_notification ON public.posts;
CREATE TRIGGER on_new_post_subscription_notification
    AFTER INSERT ON public.posts
    FOR EACH ROW
    WHEN (NEW.is_public = true)
    EXECUTE FUNCTION public.handle_new_post_subscription_notification();
