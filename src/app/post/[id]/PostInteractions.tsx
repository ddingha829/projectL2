"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

export default function PostInteractions({ 
  postId, authorId, initialLikes, initialComments, user, prevId, nextId, initialIsLiked = false 
}: { 
  postId: string, 
  authorId: string, 
  initialLikes: number, 
  initialComments: any[], 
  user: any,
  prevId?: string,
  nextId?: string,
  initialIsLiked?: boolean
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isLikedLocally, setIsLikedLocally] = useState(initialIsLiked);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  
  const handleLike = async () => {
    // Optimistic UI update
    const newLikedState = !isLikedLocally;
    setIsLikedLocally(newLikedState);
    setLikes(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

    if (postId.length > 10) {
      if (newLikedState) {
        // Add Like
        if (user) {
          await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
        }
        await supabase.rpc('increment_post_likes', { p_id: postId });
      } else {
        // Remove Like
        if (user) {
          await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId);
        }
        await supabase.rpc('decrement_post_likes', { p_id: postId });
      }
    }
  };
  
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    if (postId.length > 10) {
      const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single();
      
      const newCommentData = {
        post_id: postId,
        user_id: user.id,
        content: newComment.trim()
      };
      
      const { data, error } = await supabase.from('comments').insert(newCommentData).select().single();
      
      if (!error && data) {
        setComments([{ ...data, user: profile }, ...comments]);
      }
    }
    setNewComment("");
    setIsSubmitting(false);
    router.refresh();
  };
  
  return (
    <>
      <div className={styles.interactionBar}>
        <div className={styles.navArrowArea}>
          {prevId ? (
            <Link href={`/post/db-${prevId}`} className={styles.navArrow} title="이전 글">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </Link>
          ) : <div className={styles.navArrowDisabled} />}
        </div>

        <button 
          onClick={handleLike} 
          className={`${styles.likeBtnModern} ${isLikedLocally ? styles.liked : ""}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isLikedLocally ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.likeIcon}>
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
          <span className={styles.likeLabel}>좋아요 {likes}</span>
        </button>

        <div className={styles.navArrowArea}>
          {nextId ? (
            <Link href={`/post/db-${nextId}`} className={styles.navArrow} title="다음 글">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </Link>
          ) : <div className={styles.navArrowDisabled} />}
        </div>
      </div>

      <section id="comments" className={styles.commentsSection}>
        <h2 className={styles.commentsTitle}>댓글 ({comments.length})</h2>
        
        <div className={styles.commentInputArea}>
          {!user && (
            <div className={styles.loginPrompt}>
              <p>댓글 작성을 위해서는 로그인이 필요합니다.<br />(비회원은 좋아요만 가능)</p>
            </div>
          )}
          
          <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea 
              className={styles.commentInput} 
              placeholder="자유롭게 의견을 남겨주세요..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={!user || isSubmitting}
              required
            />
            <button type="submit" className={styles.submitBtn} disabled={!user || isSubmitting || !newComment.trim()}>
              {isSubmitting ? "등록 중..." : "등록"}
            </button>
          </form>
        </div>

        <div className={styles.commentList}>
          {comments.length > 0 ? comments.map((c: any) => {
            const isAuthor = (c.user_id === authorId) || (c.user?.id === authorId);
            const dateStr = new Date(c.created_at).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
            return (
              <div key={c.id} className={`${styles.comment} ${isAuthor ? styles.authorComment : ""}`}>
                <div className={styles.commentHeader}>
                  <div className={styles.commentUserSide}>
                    <div className={styles.commentAvatar}>
                      {c.user?.avatar_url ? (
                        <img src={c.user.avatar_url} alt={c.user.display_name} />
                      ) : (
                        <div className={styles.avatarPlaceholder}>👤</div>
                      )}
                    </div>
                    <div className={styles.commentUserInfo}>
                      <span className={styles.commentNickname}>{c.user?.display_name || c.user?.name || '익명 작가'}</span>
                      {isAuthor && <span className={styles.writerBadge}>에디터</span>}
                    </div>
                  </div>
                  <span className={styles.commentDate}>{dateStr}</span>
                </div>
                <div className={styles.commentBody}>
                  <p className={styles.commentText}>{c.content}</p>
                </div>
              </div>
            );
          }) : (
             <p style={{ color: 'var(--text-muted)' }}>첫 번째 댓글을 남겨보세요!</p>
          )}
        </div>
      </section>
    </>
  );
}
