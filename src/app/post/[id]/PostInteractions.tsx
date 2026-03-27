"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

export default function PostInteractions({ postId, authorId, initialLikes, initialComments, user }: { postId: string, authorId: string, initialLikes: number, initialComments: any[], user: any }) {
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isLikedLocally, setIsLikedLocally] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  
  const handleLike = async () => {
    if (isLikedLocally) return;
    setLikes((l) => l + 1);
    setIsLikedLocally(true);
    
    if (postId.length > 10) {
      if (user) {
        const { error } = await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
        if (!error) {
           await supabase.rpc('increment_post_likes', { p_id: postId });
        }
      } else {
        await supabase.rpc('increment_post_likes', { p_id: postId });
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
      <div className={styles.evaluation}>
        <button 
          onClick={handleLike} 
          className={`${styles.evalBtn} ${styles.likeBtn} ${isLikedLocally ? styles.liked : ""}`}
          style={isLikedLocally ? { backgroundColor: 'transparent', color: 'var(--text-main)' } : {}}
        >
          👍 Like ({likes})
        </button>
      </div>

      <section id="comments" className={styles.commentsSection}>
        <h2 className={styles.commentsTitle}>Comments ({comments.length})</h2>
        
        <div className={styles.commentInputArea}>
          {!user && (
            <div className={styles.loginPrompt}>
              <p>댓글 작성을 위해서는 로그인이 필요합니다. (비회원은 Like만 가능)</p>
              <Link href="/login">
                 <button className={styles.loginActionBtn}>Login to Comment</button>
              </Link>
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
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>

        <div className={styles.commentList}>
          {comments.length > 0 ? comments.map((c: any) => {
            const isAuthor = (c.user_id === authorId) || (c.user?.id === authorId);
            return (
              <div key={c.id} className={`${styles.comment} ${isAuthor ? styles.authorComment : ""}`}>
                <div className={styles.commentMeta}>
                  <div className={styles.commentAuthorInfo}>
                    <span className={styles.commentAuthor}>{c.user?.display_name || c.user?.name || '익명 작가'}</span>
                    {isAuthor && <span className={styles.writerBadge}>Writer</span>}
                  </div>
                  <span className={styles.commentDate}>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className={styles.commentText}>{c.content}</p>
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
