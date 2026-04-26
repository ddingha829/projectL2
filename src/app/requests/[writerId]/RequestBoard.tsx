"use client";

import { useState, useEffect } from "react";
import { submitReviewRequest, getReviewRequests, replyToRequest, updateRequestStatus } from "@/app/actions/requests";
import styles from "./RequestBoard.module.css";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface RequestBoardProps {
  writerId: string;
  writerName: string;
  color: string;
}

export default function RequestBoard({ writerId, writerName, color }: RequestBoardProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [newRequest, setNewRequest] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("user");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    setIsSubmitting(true);
    const result = await updateRequestStatus(requestId, newStatus);
    if (result.success) {
      fetchRequests();
    }
    setIsSubmitting(false);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { text: '대기 중', color: '#94a3b8' };
      case 'writing': return { text: '작성 중', color: '#ff8c00' };
      case 'completed': return { text: '답변 완료', color: '#10b981' };
      case 'canceled': return { text: '취소됨', color: '#ef4444' };
      default: return { text: '대기 중', color: '#94a3b8' };
    }
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

  const isAuthorUser = role === 'admin' || role === 'editor';

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          뒤로가기
        </button>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>
            <span style={{ color: color }}>{writerName}</span> 작가님에게 리뷰 요청하기
          </h1>
          <p className={styles.subtitle}>독자들이 보고 싶은 리뷰를 직접 제안하는 공간입니다.</p>
        </div>
      </header>

      <div className={styles.mainContent}>
        <section className={styles.formSection}>
          <h3 className={styles.sectionHeading}>새 요청 남기기</h3>
          <form onSubmit={handleSubmit} className={styles.requestForm}>
            {!user && <p className={styles.loginMsg}>💡 로그인이 필요한 기능입니다.</p>}
            <textarea
              className={styles.textarea}
              placeholder="어떤 리뷰가 보고 싶으신가요? 구체적으로 적어주실수록 작가님에게 도움이 됩니다."
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
                요청 제출하기
              </button>
            </div>
            {message && (
              <div className={`${styles.message} ${styles[message.type]}`}>
                {message.text}
              </div>
            )}
          </form>
        </section>

        <section className={styles.listSection}>
          <h3 className={styles.sectionHeading}>요청 게시판 ({requests.length})</h3>
          <div className={styles.requestList}>
            {requests.length === 0 ? (
              <div className={styles.emptyState}>아직 요청이 없습니다. 첫 번째 요청을 남겨보세요!</div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className={styles.requestItem}>
                  <div className={styles.itemHeader}>
                    <div className={styles.userInfo}>
                      <span className={styles.avatar}>👤</span>
                      <span className={styles.userName}>{req.user?.display_name || '익명의 독자'}</span>
                      <span className={styles.requestId}>r{String(req.serial_id || 0).padStart(5, '0')}</span>
                    </div>
                    <span className={styles.date}>{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className={styles.itemContent}>{req.content}</p>

                  <div className={styles.statusRow}>
                    <span 
                      className={styles.statusBadge} 
                      style={{ backgroundColor: getStatusLabel(req.status).color }}
                    >
                      {getStatusLabel(req.status).text}
                    </span>
                    
                    {isAuthorUser && !req.reply && (
                      <div className={styles.statusActions}>
                        <button 
                          onClick={() => handleStatusUpdate(req.id, 'writing')}
                          className={`${styles.statusUpdateBtn} ${req.status === 'writing' ? styles.activeStatus : ''}`}
                          disabled={isSubmitting}
                        >
                          ✍️ 작성 중으로 변경
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Writer's Reply */}
                  {req.reply ? (
                    <div className={styles.authorReply} style={{ borderLeft: `4px solid ${color}`, backgroundColor: `${color}08` }}>
                      <div className={styles.replyHeader}>
                        <span className={styles.authorBadge} style={{ backgroundColor: color }}>Writer Response</span>
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
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
