-- 1. 댓글 테이블에 parent_id 추가 (답글 기능 지원용)
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- 2. 댓글 좋아요 테이블 생성
CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, comment_id)
);

-- 3. 알림 테이블 생성
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'like_post', 'comment_post', 'reply_comment', 'like_comment'
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    content_preview TEXT
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON public.notifications(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS 설정
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 생성 (중복 방지)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON public.comment_likes;
CREATE POLICY "Comment likes are viewable by everyone" ON public.comment_likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage their own comment likes" ON public.comment_likes;
CREATE POLICY "Authenticated users can manage their own comment likes" ON public.comment_likes
    FOR ALL USING (auth.uid() = user_id);

-- 4. 알림 자동 생성 트리거 함수

-- A. 게시물 좋아요 알림
CREATE OR REPLACE FUNCTION public.handle_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_author_id UUID;
BEGIN
    SELECT author_id INTO v_author_id FROM public.posts WHERE id = NEW.post_id;
    
    -- 본인이 본인 글에 좋아요 누른 경우는 제외
    IF v_author_id IS NOT NULL AND v_author_id != NEW.user_id THEN
        INSERT INTO public.notifications (receiver_id, sender_id, type, post_id)
        VALUES (v_author_id, NEW.user_id, 'like_post', NEW.post_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_like_notification ON public.likes;
CREATE TRIGGER on_post_like_notification
    AFTER INSERT ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_post_like_notification();

-- B. 게시물 댓글 알림
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_post_author_id UUID;
    v_parent_comment_author_id UUID;
BEGIN
    -- 1. 게시물 작성자 알림
    SELECT author_id INTO v_post_author_id FROM public.posts WHERE id = NEW.post_id;
    
    IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.user_id THEN
        INSERT INTO public.notifications (receiver_id, sender_id, type, post_id, comment_id, content_preview)
        VALUES (v_post_author_id, NEW.user_id, 'comment_post', NEW.post_id, NEW.id, LEFT(NEW.content, 50));
    END IF;

    -- 2. 답글인 경우 원본 댓글 작성자 알림
    IF NEW.parent_id IS NOT NULL THEN
        SELECT user_id INTO v_parent_comment_author_id FROM public.comments WHERE id = NEW.parent_id;
        
        IF v_parent_comment_author_id IS NOT NULL AND v_parent_comment_author_id != NEW.user_id AND v_parent_comment_author_id != v_post_author_id THEN
            INSERT INTO public.notifications (receiver_id, sender_id, type, post_id, comment_id, content_preview)
            VALUES (v_parent_comment_author_id, NEW.user_id, 'reply_comment', NEW.post_id, NEW.id, LEFT(NEW.content, 50));
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_notification ON public.comments;
CREATE TRIGGER on_comment_notification
    AFTER INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_comment_notification();

-- C. 댓글 좋아요 알림
CREATE OR REPLACE FUNCTION public.handle_comment_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_comment_author_id UUID;
    v_post_id UUID;
BEGIN
    SELECT user_id, post_id INTO v_comment_author_id, v_post_id FROM public.comments WHERE id = NEW.comment_id;
    
    IF v_comment_author_id IS NOT NULL AND v_comment_author_id != NEW.user_id THEN
        INSERT INTO public.notifications (receiver_id, sender_id, type, post_id, comment_id)
        VALUES (v_comment_author_id, NEW.user_id, 'like_comment', v_post_id, NEW.comment_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_like_notification ON public.comment_likes;
CREATE TRIGGER on_comment_like_notification
    AFTER INSERT ON public.comment_likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_comment_like_notification();
