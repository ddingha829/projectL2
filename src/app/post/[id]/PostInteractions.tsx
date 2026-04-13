"use client";

import { useState, useEffect } from "react";
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
  
  // [PoC] Contextual Commenting States
  const [activeAnchor, setActiveAnchor] = useState<{ id: string, text: string } | null>(null);
  const [selectedAnchor, setSelectedAnchor] = useState<{ id: string, text: string } | null>(null);

  // [신규] 댓글 수정/삭제 상태
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // [PoC] Selection handle logic
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      
      let container = selection.getRangeAt(0).commonAncestorContainer;
      if (container.nodeType === 3) container = container.parentElement!;
      
      const segment = (container as HTMLElement).closest('[data-segment-id]');
      if (segment) {
        const fullText = selection.toString().trim();
        setActiveAnchor({
          id: segment.getAttribute('data-segment-id') || '',
          text: fullText
        });
      }
    };

    document.addEventListener('selectionchange', handleSelection);

    // [BugFix] Guest Like Persistence Checking
    if (!user) {
      const guestLikes = JSON.parse(localStorage.getItem("guest_likes") || "[]");
      if (guestLikes.includes(postId)) {
        setIsLikedLocally(true);
      }
    }

    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [postId, user]);

  const handleJump = (id: string) => {
    const el = document.querySelector(`[data-segment-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Temporary highlight
      (el as HTMLElement).style.backgroundColor = 'rgba(186, 230, 253, 0.4)';
      setTimeout(() => {
        (el as HTMLElement).style.backgroundColor = 'transparent';
      }, 2000);
    }
  };
  
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
        } else {
          // Guest logic
          const guestLikes = JSON.parse(localStorage.getItem("guest_likes") || "[]");
          if (!guestLikes.includes(postId)) {
            guestLikes.push(postId);
            localStorage.setItem("guest_likes", JSON.stringify(guestLikes));
          }
        }
        await supabase.rpc('increment_post_likes', { p_id: postId });
      } else {
        // Remove Like
        if (user) {
          await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId);
        } else {
          // Guest logic
          let guestLikes = JSON.parse(localStorage.getItem("guest_likes") || "[]");
          guestLikes = guestLikes.filter((id: string) => id !== postId);
          localStorage.setItem("guest_likes", JSON.stringify(guestLikes));
        }
        await supabase.rpc('decrement_post_likes', { p_id: postId });
      }
    }
  };
  
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    if (selectedAnchor && selectedAnchor.text.length > 20) {
      alert("20글자 이내로 인용 가능합니다");
      return;
    }
    
    setIsSubmitting(true);
    if (postId.length > 10) {
      const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single();
      
      // [PoC] Add anchor info if present
      let finalContent = newComment.trim();
      if (selectedAnchor) {
        finalContent = `[quote:${selectedAnchor.id}:${selectedAnchor.text}] ${finalContent}`;
      }

      const newCommentData = {
        post_id: postId,
        user_id: user.id,
        content: finalContent
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

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      setComments(comments.filter(c => c.id !== commentId));
      router.refresh();
    }
  };

  const startEditing = (id: string, content: string) => {
    setEditingCommentId(id);
    setEditContent(content);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return;
    
    const { error } = await supabase
      .from('comments')
      .update({ content: editContent.trim() })
      .eq('id', commentId);
      
    if (error) {
      alert("수정 실패: " + error.message);
    } else {
      setComments(comments.map(c => c.id === commentId ? { ...c, content: editContent.trim() } : c));
      setEditingCommentId(null);
      router.refresh();
    }
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
            {activeAnchor && !selectedAnchor && (
              <div 
                className={`${styles.quotePrompt} ${activeAnchor.text.length > 20 ? styles.quotePromptError : ''}`}
                onClick={() => {
                  if (activeAnchor.text.length > 20) {
                    alert("20글자 이내로 인용 가능합니다");
                  } else {
                    setSelectedAnchor(activeAnchor);
                  }
                }}
              >
                <span>" {activeAnchor.text}{activeAnchor.text.length >= 20 ? '...' : ''} "</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>* 버튼을 눌러야만 인용됩니다</span>
                  <button type="button" className={styles.quoteBtn}>
                    {activeAnchor.text.length > 20 ? '인용 불가' : '이 위치 인용하기'}
                  </button>
                </div>
              </div>
            )}
            {selectedAnchor && (
              <div className={styles.selectedQuote}>
                <span>선택됨: "{selectedAnchor.text}"</span>
                <button type="button" onClick={() => setSelectedAnchor(null)}>❌</button>
              </div>
            )}
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
              <div key={c.id} id={`comment-${c.id}`} className={`${styles.comment} ${isAuthor ? styles.authorComment : ""}`}>
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
                      {isAuthor && <span className={styles.writerBadge}>티끌러</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                    <span className={styles.commentDate}>{dateStr}</span>
                    
                    {/* 수정/삭제 버튼 (본인 또는 운영자) */}
                    {(user?.id === c.user_id || user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin') && (
                      <div className={styles.commentActions}>
                        <button className={styles.actionIconBtn} onClick={() => startEditing(c.id, c.content)} title="수정">✏️</button>
                        <button className={`${styles.actionIconBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteComment(c.id)} title="삭제">🗑️</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.commentBody}>
                  {editingCommentId === c.id ? (
                    <div className={styles.editArea}>
                      <textarea 
                        className={styles.editInput} 
                        value={editContent} 
                        onChange={(e) => setEditContent(e.target.value)}
                      />
                      <div className={styles.editActions}>
                        <button className={styles.saveBtn} onClick={() => handleUpdateComment(c.id)}>저장</button>
                        <button className={styles.cancelBtn} onClick={() => setEditingCommentId(null)}>취소</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {c.content.startsWith('[quote:') ? (() => {
                        const match = c.content.match(/^\[quote:(.*?):(.*?)\] (.*)$/);
                        if (match) {
                          return (
                            <>
                              <div 
                                className={styles.commentQuote}
                                onClick={() => handleJump(match[1])}
                              >
                                <span className={styles.quoteIcon}>❝</span>
                                <span className={styles.quoteText}>{match[2]}</span>
                                <span className={styles.jumpBadge}>이동</span>
                              </div>
                              <p className={styles.commentText}>{match[3]}</p>
                            </>
                          );
                        }
                        return <p className={styles.commentText}>{c.content}</p>;
                      })() : (
                        <p className={styles.commentText}>{c.content}</p>
                      )}
                    </>
                  )}
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
