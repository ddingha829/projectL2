"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from "@/app/actions/notifications";
import { createClient } from "@/lib/supabase/client";
import Toast from "@/components/common/Toast";
import styles from "./NotificationSystem.module.css";

export default function NotificationSystem({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [toasts, setToasts] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchBadge = async () => {
    if (!user) return;
    const count = await getUnreadCount();
    setUnreadCount(count);
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const data = await getNotifications();
    setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBadge();
    
    if (!user) return;

    // Supabase Realtime setup
    const channel = supabase
      .channel(`realtime:notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload) => {
          setUnreadCount(prev => prev + 1);
          
          const { data: sender } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newToast = {
            id: payload.new.id,
            type: payload.new.type.includes('like') ? 'like' : 'comment',
            senderName: sender?.display_name || '티끌러',
            senderAvatar: sender?.avatar_url,
            message: payload.new.type === 'like_post' ? '님의 게시물을 좋아합니다' : 
                     payload.new.type === 'comment_post' ? '님이 게시물에 댓글을 남겼습니다' :
                     payload.new.type === 'reply_comment' ? '님이 회원님의 댓글에 답글을 남겼습니다' :
                     '님이 알림을 보냈습니다'
          };
          
          setToasts(prev => [...prev, newToast]);
          
          if (isOpen) {
            fetchData();
          }
        }
      )
      .subscribe();

    const interval = setInterval(fetchBadge, 60000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isUnread = notifications.find(n => n.id === id && !n.is_read);
    const { success } = await deleteNotification(id);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (isUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  if (!user) return null;

  const getTypeLabel = (n: any) => {
    switch (n.type) {
      case 'like_post': return '님의 게시물을 좋아합니다';
      case 'comment_post': return '님이 게시물에 댓글을 남겼습니다';
      case 'reply_comment': return '님이 회원님의 댓글에 답글을 남겼습니다';
      case 'like_comment': return '님이 회원님의 댓글을 좋아합니다';
      default: return '님이 알림을 보냈습니다';
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  };

  const formatContent = (content: string) => {
    if (!content) return "";
    return content.replace(/^\[quote:.*?:(.*?)\]\s*/, '“$1” ');
  };

  return (
    <div className={styles.notificationWrapper} ref={dropdownRef}>
      <button 
        className={styles.bellBtn} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="알림"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {mounted && isMobile ? createPortal(
              <>
                <motion.div 
                  className={styles.backdrop}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                />
                
                <motion.div 
                  className={styles.dropdown}
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                >
                  <div className={styles.header}>
                    <h3>알림</h3>
                    <div className={styles.headerActions}>
                      {unreadCount > 0 && (
                        <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                          모두 읽음
                        </button>
                      )}
                      <button className={styles.mobileCloseBtn} onClick={() => setIsOpen(false)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
    
                  <div className={styles.list}>
                    {loading ? (
                      <div className={styles.empty}>불러오는 중...</div>
                    ) : notifications.length > 0 ? (
                      <>
                        {notifications.map((n) => (
                          <div key={n.id} className={styles.itemWrapper}>
                            <Link 
                              href={`/post/db-${n.post_id}${n.type.includes('comment') ? `#comment-${n.comment_id}` : ''}`}
                              className={`${styles.item} ${!n.is_read ? styles.unreadItem : ''}`}
                              onClick={() => {
                                if (!n.is_read) handleMarkAsRead(n.id);
                                setIsOpen(false);
                              }}
                            >
                              {n.sender?.avatar_url ? (
                                <img src={n.sender.avatar_url} alt="" className={styles.avatar} />
                              ) : (
                                <div className={styles.avatarPlaceholder}>👤</div>
                              )}
                              <div className={styles.content}>
                                <div className={styles.message}>
                                  <span className={styles.senderName}>{n.sender?.display_name || '익명'}</span>
                                  {getTypeLabel(n)}
                                </div>
                                <span className={styles.time}>{getTimeAgo(n.created_at)}</span>
                                {n.content_preview && (
                                  <div className={styles.preview}>
                                    {formatContent(n.content_preview)}
                                  </div>
                                )}
                              </div>
                            </Link>
                            <button 
                              className={styles.deleteBtn}
                              onClick={(e) => handleDelete(e, n.id)}
                              aria-label="알림 삭제"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        ))}
                        <Link href="/activities" className={styles.seeAllBtn} onClick={() => setIsOpen(false)}>
                          모든 활동 보기
                        </Link>
                      </>
                    ) : (
                      <div className={styles.empty}>
                        <div className={styles.emptyIcon}>🔔</div>
                        <p>새로운 알림이 없습니다</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>,
              document.body
            ) : (
              <>
                <motion.div 
                  className={styles.backdrop}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                />
                
                <motion.div 
                  className={styles.dropdown}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={styles.header}>
                    <h3>알림</h3>
                    <div className={styles.headerActions}>
                      {unreadCount > 0 && (
                        <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                          모두 읽음
                        </button>
                      )}
                    </div>
                  </div>
    
                  <div className={styles.list}>
                    {loading ? (
                      <div className={styles.empty}>불러오는 중...</div>
                    ) : notifications.length > 0 ? (
                      <>
                        {notifications.map((n) => (
                          <div key={n.id} className={styles.itemWrapper}>
                            <Link 
                              href={`/post/db-${n.post_id}${n.type.includes('comment') ? `#comment-${n.comment_id}` : ''}`}
                              className={`${styles.item} ${!n.is_read ? styles.unreadItem : ''}`}
                              onClick={() => {
                                if (!n.is_read) handleMarkAsRead(n.id);
                                setIsOpen(false);
                              }}
                            >
                              {n.sender?.avatar_url ? (
                                <img src={n.sender.avatar_url} alt="" className={styles.avatar} />
                              ) : (
                                <div className={styles.avatarPlaceholder}>👤</div>
                              )}
                              <div className={styles.content}>
                                <div className={styles.message}>
                                  <span className={styles.senderName}>{n.sender?.display_name || '익명'}</span>
                                  {getTypeLabel(n)}
                                </div>
                                <span className={styles.time}>{getTimeAgo(n.created_at)}</span>
                                {n.content_preview && (
                                  <div className={styles.preview}>
                                    {formatContent(n.content_preview)}
                                  </div>
                                )}
                              </div>
                            </Link>
                            <button 
                              className={styles.deleteBtn}
                              onClick={(e) => handleDelete(e, n.id)}
                              aria-label="알림 삭제"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        ))}
                        <Link href="/activities" className={styles.seeAllBtn} onClick={() => setIsOpen(false)}>
                          모든 활동 보기
                        </Link>
                      </>
                    ) : (
                      <div className={styles.empty}>
                        <div className={styles.emptyIcon}>🔔</div>
                        <p>새로운 알림이 없습니다</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </>
        )}
      </AnimatePresence>

      <div className={styles.toastContainer}>
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast 
              key={toast.id}
              {...toast}
              onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
