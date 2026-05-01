"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NextStoryCard from "./NextStoryCard";
import styles from "./page.module.css";

export default function PostInteractions({ 
  postId, authorId, initialLikes, initialComments, user, prevId, nextId, recommendedPost, isAdmin = false, initialIsLiked = false 
}: { 
  postId: string, 
  authorId: string, 
  initialLikes: number, 
  initialComments: any[], 
  user: any,
  prevId?: string,
  nextId?: string,
  recommendedPost: any, // 추가
  isAdmin?: boolean,
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
  const [selectionCoords, setSelectionCoords] = useState<{ x: number, y: number } | null>(null);
  const [isInlineOpen, setIsInlineOpen] = useState(false);
  const [inlineComment, setInlineComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<string, number>>({});
  const [userCommentLikes, setUserCommentLikes] = useState<string[]>([]);


  const supabase = createClient();
  const router = useRouter();

  // [신규] 조회수 중복 방지 (클라이언트 측 localStorage 활용)
  useEffect(() => {
    const incrementView = async () => {
      if (!postId) return;
      
      const storageKey = `viewed_post_${postId}`;
      const lastViewed = localStorage.getItem(storageKey);
      const now = Date.now();
      
      // 24시간 이내에 조회한 적이 없으면 조회수 증가 (86400000ms = 24시간)
      if (!lastViewed || (now - parseInt(lastViewed) > 86400000)) {
        await supabase.rpc('increment_post_views', { post_id: postId });
        localStorage.setItem(storageKey, now.toString());
        // Note: router.refresh()는 조회수가 즉시 반영되길 원하면 호출하지만, 
        // 조회수 하나 때문에 전체 페이지를 다시 그리는 것은 부하가 클 수 있어 생략하거나 지연 처리 가능
      }
    };

    incrementView();
  }, [postId, supabase]);

  useEffect(() => {
    // [PoC] Selection handle logic
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      
      let container = selection.getRangeAt(0).commonAncestorContainer;
      if (container.nodeType === 3) container = container.parentElement!;
      
      const segment = (container as HTMLElement).closest('[data-segment-id]');
      
      // [신규] 인용 제외 영역 체크 (리뷰 카드 내부 등)
      const isInsideReviewCard = (container as HTMLElement).closest('[class*="ql-review-card"]') || 
                                 (container as HTMLElement).closest('[class*="authorCardWrapper"]');

      if (segment && !isInsideReviewCard) {
        const fullText = selection.toString().trim();
        setActiveAnchor({
          id: segment.getAttribute('data-segment-id') || '',
          text: fullText
        });

        // Calculate coordinates for floating button
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionCoords({
          x: rect.left + rect.width / 2,
          y: rect.top + window.scrollY
        });
      } else {
        if (!isInlineOpen) {
          setSelectionCoords(null);
          setActiveAnchor(null);
        }
      }
    };

    document.addEventListener('selectionchange', handleSelection);

    // [BugFix] Guest Like Persistence Checking
    if (!user) {
      const guestLikes = JSON.parse(localStorage.getItem("guest_likes") || "[]");
      if (guestLikes.includes(postId)) {
        setIsLikedLocally(true);
      }
    } else {
      // Fetch comment likes for user
      const fetchCommentLikes = async () => {
        const { data } = await supabase.from('comment_likes').select('comment_id').eq('user_id', user.id);
        if (data) setUserCommentLikes(data.map(d => d.comment_id));
      };
      fetchCommentLikes();
    }

    // Initialize comment likes count
    const counts: Record<string, number> = {};
    comments.forEach((c: any) => {
      counts[c.id] = c.likes_count || 0; // Assuming we add likes_count to comments later or fetch it
    });
    setCommentLikes(counts);

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
  };
  
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    if (selectedAnchor && selectedAnchor.text.length > 30) {
      alert("30글자 이내로 인용 가능합니다");
      return;
    }
    
    setIsSubmitting(true);
    const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single();
    
    // [PoC] Add anchor info if present
    let finalContent = newComment.trim();
    if (selectedAnchor) {
      finalContent = `[quote:${selectedAnchor.id}:${selectedAnchor.text}] ${finalContent}`;
    }

    const newCommentData = {
      post_id: postId,
      user_id: user.id,
      content: finalContent,
      parent_id: replyTo?.id || null
    };
    
    const { data, error } = await supabase.from('comments').insert(newCommentData).select().single();
    
    if (error) {
      alert("댓글 등록에 실패했습니다: " + error.message);
    } else if (data) {
      setComments([{ ...data, user: profile }, ...comments]);
      setNewComment("");
      setSelectedAnchor(null); 
      setReplyTo(null);
    }
    
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

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      alert("로그인이 필요합니다");
      return;
    }

    const isLiked = userCommentLikes.includes(commentId);
    if (isLiked) {
      await supabase.from('comment_likes').delete().eq('user_id', user.id).eq('comment_id', commentId);
      setUserCommentLikes(prev => prev.filter(id => id !== commentId));
      setCommentLikes(prev => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] || 0) - 1) }));
    } else {
      await supabase.from('comment_likes').insert({ user_id: user.id, comment_id: commentId });
      setUserCommentLikes(prev => [...prev, commentId]);
      setCommentLikes(prev => ({ ...prev, [commentId]: (prev[commentId] || 0) + 1 }));
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
        {/* [Premium Editorial] Next Story Recommendation - Placed inside section, below the thick border */}
        <NextStoryCard post={recommendedPost} />
        
        <h2 className={styles.commentsTitle}>댓글 ({comments.length})</h2>
        
        <div className={styles.commentInputArea}>
          {!user && (
            <div className={styles.loginPrompt}>
              <p>댓글 작성을 위해서는 로그인이 필요합니다.<br />(비회원은 좋아요만 가능)</p>
            </div>
          )}
          
          <form id="comment-form" onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeAnchor && !selectedAnchor && (
              <div 
                className={`${styles.quotePrompt} ${activeAnchor.text.length > 30 ? styles.quotePromptError : ''}`}
                onClick={() => {
                  if (activeAnchor.text.length > 30) {
                    alert("30글자 이내로 인용 가능합니다");
                  } else {
                    setSelectedAnchor(activeAnchor);
                  }
                }}
              >
                <span>" {activeAnchor.text}{activeAnchor.text.length >= 30 ? '...' : ''} "</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>* 버튼을 눌러야만 인용됩니다</span>
                  <button type="button" className={styles.quoteBtn}>
                    {activeAnchor.text.length > 30 ? '인용 불가' : '이 위치 인용하기'}
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
            {replyTo && (
              <div className={styles.replyNotice}>
                <span>@{replyTo.name} 님에게 답글 남기는 중</span>
                <button type="button" onClick={() => setReplyTo(null)}>❌</button>
              </div>
            )}
            <textarea 
              className={styles.commentInput} 
              placeholder={replyTo ? "답글을 입력하세요..." : "자유롭게 의견을 남겨주세요..."} 
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
          {comments.length > 0 ? (() => {
            // Root parents
            const parents = comments.filter(c => !c.parent_id);
            const childrenMap: Record<string, any[]> = {};
            
            // Map each comment to its root parent for 1-level nesting UI
            comments.forEach(c => {
              if (c.parent_id) {
                let rootId = c.parent_id;
                let safety = 0;
                while (safety < 5) {
                  const parentComment = comments.find(pc => pc.id === rootId);
                  if (parentComment && parentComment.parent_id) {
                    rootId = parentComment.parent_id;
                  } else {
                    break;
                  }
                  safety++;
                }
                if (!childrenMap[rootId]) childrenMap[rootId] = [];
                childrenMap[rootId].push(c);
              }
            });

            return parents.map((p: any) => {
              const replies = childrenMap[p.id] || [];
              const isAuthor = (p.user_id === authorId) || (p.user?.id === authorId);
              const dateStr = new Date(p.created_at).toLocaleString('ko-KR', {
                year: 'numeric', month: '2-digit', day: '2-digit', 
                hour: '2-digit', minute: '2-digit', hour12: false
              });

              return (
                <div key={p.id} className={styles.commentGroup}>
                  <div id={`comment-${p.id}`} className={`${styles.comment} ${isAuthor ? styles.authorComment : ""}`}>
                    <div className={styles.commentHeader}>
                      <div className={styles.commentUserSide}>
                        <div className={styles.commentAvatar}>
                          {p.user?.avatar_url ? (
                            <img src={p.user.avatar_url} alt={p.user.display_name} />
                          ) : (
                            <div className={styles.avatarPlaceholder}>👤</div>
                          )}
                        </div>
                        <div className={styles.commentUserInfoRow}>
                          <span className={styles.commentNickname}>{p.user?.display_name || p.user?.name || '익명 작가'}</span>
                          {isAuthor && <span className={styles.writerBadge}>티끌러</span>}
                        </div>
                      </div>
                      <div className={styles.commentMetaRight}>
                        <span className={styles.commentDate}>{dateStr}</span>
                        {(user?.id === p.user_id || isAdmin) && (
                          <div className={styles.commentActions}>
                            <button className={styles.actionIconBtn} onClick={() => startEditing(p.id, p.content)} title="수정">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button className={`${styles.actionIconBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteComment(p.id)} title="삭제">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.commentBody}>
                      {editingCommentId === p.id ? (
                        <div className={styles.editArea}>
                          <textarea className={styles.editInput} value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                          <div className={styles.editActions}>
                            <button className={styles.saveBtn} onClick={() => handleUpdateComment(p.id)}>저장</button>
                            <button className={styles.cancelBtn} onClick={() => setEditingCommentId(null)}>취소</button>
                          </div>
                        </div>
                      ) : (
                        p.content.startsWith('[quote:') ? (() => {
                          const match = p.content.match(/^\[quote:(.*?):(.*?)\] (.*)$/);
                          if (match) return (
                            <>
                              <div className={styles.commentQuote} onClick={() => handleJump(match[1])}>
                                <span className={styles.quoteIcon}>❝</span>
                                <span className={styles.quoteText}>{match[2]}</span>
                                <span className={styles.jumpBadge}>이동</span>
                              </div>
                              <p className={styles.commentText}>{match[3]}</p>
                            </>
                          );
                          return <p className={styles.commentText}>{p.content}</p>;
                        })() : <p className={styles.commentText}>{p.content}</p>
                      )}
                    </div>
                    <div className={styles.commentFooter}>
                      <button className={`${styles.commentActionBtn} ${userCommentLikes.includes(p.id) ? styles.commentLiked : ''}`} onClick={() => handleLikeComment(p.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={userCommentLikes.includes(p.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        좋아요 {commentLikes[p.id] || 0}
                      </button>
                      <button className={styles.commentActionBtn} onClick={() => { setReplyTo({ id: p.id, name: p.user?.display_name || '익명' }); document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth' }); }}>
                        답글 달기
                      </button>
                    </div>
                  </div>

                  {replies.length > 0 && (
                    <div className={styles.repliesArea}>
                      {replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((cp: any) => {
                        const isRepAuthor = (cp.user_id === authorId) || (cp.user?.id === authorId);
                        const repDateStr = new Date(cp.created_at).toLocaleString('ko-KR', {
                          year: 'numeric', month: '2-digit', day: '2-digit', 
                          hour: '2-digit', minute: '2-digit', hour12: false
                        });
                        return (
                          <div key={cp.id} id={`comment-${cp.id}`} className={`${styles.comment} ${styles.replyComment} ${isRepAuthor ? styles.authorComment : ""}`}>
                            <div className={styles.replyArrow}>└</div>
                            <div className={styles.replyContent}>
                              <div className={styles.commentHeader}>
                                <div className={styles.commentUserSide}>
                                  <div className={styles.commentAvatar}>
                                    {cp.user?.avatar_url ? (
                                      <img src={cp.user.avatar_url} alt={cp.user.display_name} className={styles.smallAvatar} />
                                    ) : (
                                      <div className={`${styles.avatarPlaceholder} ${styles.smallAvatarPlaceholder}`}>👤</div>
                                    )}
                                  </div>
                                  <div className={styles.commentUserInfoRow}>
                                    <span className={styles.commentNickname}>{cp.user?.display_name || cp.user?.name || '익명 작가'}</span>
                                    {isRepAuthor && <span className={styles.writerBadge}>티끌러</span>}
                                  </div>
                                </div>
                                <div className={styles.commentMetaRight}>
                                  <span className={styles.commentDate}>{repDateStr}</span>
                                  {(user?.id === cp.user_id || isAdmin) && (
                                    <div className={styles.commentActions}>
                                      <button className={styles.actionIconBtn} onClick={() => startEditing(cp.id, cp.content)} title="수정">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                      </button>
                                      <button className={`${styles.actionIconBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteComment(cp.id)} title="삭제">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className={styles.commentBody}>
                                {editingCommentId === cp.id ? (
                                  <div className={styles.editArea}>
                                    <textarea className={styles.editInput} value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                                    <div className={styles.editActions}>
                                      <button className={styles.saveBtn} onClick={() => handleUpdateComment(cp.id)}>저장</button>
                                      <button className={styles.cancelBtn} onClick={() => setEditingCommentId(null)}>취소</button>
                                    </div>
                                  </div>
                                ) : (
                                  cp.content.startsWith('[quote:') ? (() => {
                                    const match = cp.content.match(/^\[quote:(.*?):(.*?)\] (.*)$/);
                                    if (match) return (
                                      <>
                                        <div className={styles.commentQuote} onClick={() => handleJump(match[1])}>
                                          <span className={styles.quoteIcon}>❝</span>
                                          <span className={styles.quoteText}>{match[2]}</span>
                                          <span className={styles.jumpBadge}>이동</span>
                                        </div>
                                        <p className={styles.commentText}>{match[3]}</p>
                                      </>
                                    );
                                    return <p className={styles.commentText}>{cp.content}</p>;
                                  })() : <p className={styles.commentText}>{cp.content}</p>
                                )}
                              </div>
                              <div className={styles.commentFooter}>
                                <button className={`${styles.commentActionBtn} ${userCommentLikes.includes(cp.id) ? styles.commentLiked : ''}`} onClick={() => handleLikeComment(cp.id)}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill={userCommentLikes.includes(cp.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                  </svg>
                                  좋아요 {commentLikes[cp.id] || 0}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })() : (
             <p style={{ color: 'var(--text-muted)' }}>첫 번째 댓글을 남겨보세요!</p>
          )}
        </div>
      </section>

      {selectionCoords && activeAnchor && activeAnchor.text.length <= 30 && (
        <div 
          className={isInlineOpen ? styles.inlineQuoteInputWrap : ""}
          style={{ 
            position: 'absolute',
            left: `${selectionCoords.x}px`, 
            top: `${selectionCoords.y}px`,
            zIndex: 2500
          }}
        >
          {!isInlineOpen ? (
            <button 
              className={styles.floatingQuoteBtn}
              style={{ position: 'relative', left: 0, top: 0, transform: 'translate(-50%, -100%)' }}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!user) {
                  alert("댓글 작성을 위해 로그인이 필요합니다");
                  return;
                }
                setIsInlineOpen(true);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              인용해서 댓글 달기
            </button>
          ) : (
            <div className={styles.inlineQuoteBubble}>
              <div className={styles.inlineQuoteHeader}>
                <span className={styles.inlineQuotePreview}>"{activeAnchor.text}"</span>
                <button className={styles.inlineCloseBtn} onClick={() => {
                  setIsInlineOpen(false);
                  setSelectionCoords(null);
                }}>✕</button>
              </div>
              <textarea 
                className={styles.inlineTextarea}
                placeholder="내용을 입력하세요..."
                autoFocus
                value={inlineComment}
                onChange={(e) => setInlineComment(e.target.value)}
              />
              <div className={styles.inlineActions}>
                <button 
                  className={styles.inlineSubmitBtn}
                  disabled={isSubmitting || !inlineComment.trim()}
                  onClick={async () => {
                    if (!inlineComment.trim()) return;
                    setIsSubmitting(true);
                    
                    const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single();
                    const finalContent = `[quote:${activeAnchor.id}:${activeAnchor.text}] ${inlineComment.trim()}`;
                    
                    const { data, error } = await supabase.from('comments').insert({
                      post_id: postId,
                      user_id: user.id,
                      content: finalContent
                    }).select().single();

                    if (!error && data) {
                      setComments([{ ...data, user: profile }, ...comments]);
                      setIsInlineOpen(false);
                      setInlineComment("");
                      setSelectionCoords(null);
                      setActiveAnchor(null);
                      router.refresh();
                    } else {
                      alert("등록 실패: " + (error?.message || "오류가 발생했습니다"));
                    }
                    setIsSubmitting(false);
                  }}
                >
                  {isSubmitting ? "..." : "등록"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
