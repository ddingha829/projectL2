"use client";

import { useState, useEffect } from "react";
import { submitReviewRequest, getReviewRequests, replyToRequest } from "@/app/actions/requests";
import styles from "./ReviewRequest.module.css";
import { createClient } from "@/lib/supabase/client";

interface ReviewRequestProps {
  writerId: string;
  color: string;
}

export default function ReviewRequest({ writerId, color }: ReviewRequestProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [newRequest, setNewRequest] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [role, setRole] = useState<string>("user");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        supabase.from('profiles').select('role').eq('id', data.user.id).single()
          .then(({ data: profile }) => setRole(profile?.role || "user"));
      }
    });
    fetchRequests();
  }, [writerId]);

  const fetchRequests = async () => {
    const data = await getReviewRequests(writerId);
    setRequests(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setMessage(null);

    const result = await submitReviewRequest(writerId, newRequest);
    if (result.success) {
      setMessage({ type: 'success', text: '요청이 성공적으로 전달되었습니다!' });
      setNewRequest("");
      setIsFormOpen(false);
      fetchRequests();
    } else {
      setMessage({ type: 'error', text: result.error || '오류가 발생했습니다.' });
    }
    setIsSubmitting(false);
  };

  const handleReply = async (requestId: string) => {
    const content = replyInputs[requestId];
    if (!content?.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await replyToRequest(requestId, content);
    if (result.success) {
      setReplyInputs(prev => ({ ...prev, [requestId]: "" }));
      fetchRequests();
    }
    setIsSubmitting(false);
  };

  const isAuthorUser = role === 'admin' || role === 'writer';

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <button 
          className={styles.toggleBtn} 
          onClick={() => setIsFormOpen(!isFormOpen)}
          style={{ '--author-color': color } as React.CSSProperties}
        >
          <span className={styles.btnIcon}>💬</span>
          작가님, 이런 리뷰도 보고싶어요!
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className={styles.requestForm}>
          {!user && <p className={styles.loginMsg}>로그인이 필요한 기능입니다.</p>}
          <textarea
            className={styles.textarea}
            placeholder="어떤 리뷰가 보고 싶으신가요? (예: 서촌 맛집, 최신 에세이...)"
            value={newRequest}
            onChange={(e) => setNewRequest(e.target.value)}
            disabled={!user || isSubmitting}
            required
          />
          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={!user || isSubmitting || !newRequest.trim()}
              style={{ backgroundColor: color }}
            >
              제출하기
            </button>
            <button 
              type="button" 
              className={styles.cancelBtn} 
              onClick={() => { setIsFormOpen(false); setMessage(null); }}
            >
              취소
            </button>
          </div>
        </form>
      )}

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {requests.length > 0 && (
        <div className={styles.requestList}>
          <h4 className={styles.listTitle}>최근 요청된 리뷰</h4>
          {requests.map((req) => (
            <div key={req.id} className={styles.requestItem}>
              <div className={styles.itemHeader}>
                <span className={styles.userName}>{req.user?.display_name || '익명의 독자'}</span>
                <span className={styles.date}>{new Date(req.created_at).toLocaleDateString()}</span>
              </div>
              <p className={styles.itemContent}>{req.content}</p>

              {/* Writer's Reply */}
              {req.reply ? (
                <div className={styles.authorReply} style={{ borderLeft: `4px solid ${color}`, backgroundColor: `${color}11` }}>
                  <div className={styles.replyHeader}>
                    <span className={styles.authorBadge} style={{ backgroundColor: color }}>Writer Reply</span>
                    <span className={styles.replyDate}>{new Date(req.replied_at).toLocaleDateString()}</span>
                  </div>
                  <p className={styles.replyText}>{req.reply}</p>
                </div>
              ) : (
                isAuthorUser && (
                  <div className={styles.replyInputArea}>
                    <input 
                      type="text" 
                      placeholder="작가로서 답변을 남겨주세요..." 
                      className={styles.replyInput}
                      value={replyInputs[req.id] || ""}
                      onChange={(e) => setReplyInputs(prev => ({ ...prev, [req.id]: e.target.value }))}
                    />
                    <button 
                      onClick={() => handleReply(req.id)}
                      className={styles.replyBtn}
                      style={{ backgroundColor: color }}
                    >
                      등록
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
