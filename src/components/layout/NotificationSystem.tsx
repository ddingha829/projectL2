"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/app/actions/notifications";
import styles from "./NotificationSystem.module.css";

export default function NotificationSystem({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    // Refresh badge every 1 minute
    const interval = setInterval(fetchBadge, 60000);
    return () => clearInterval(interval);
  }, [user]);

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
          <motion.div 
            className={styles.dropdown}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.header}>
              <h3>활동</h3>
              {unreadCount > 0 && (
                <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                  모두 읽음 처리
                </button>
              )}
            </div>

            <div className={styles.list}>
              {loading ? (
                <div className={styles.empty}>불러오는 중...</div>
              ) : notifications.length > 0 ? (
                <>
                  {notifications.map((n) => (
                    <Link 
                      key={n.id} 
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
                            {n.content_preview}
                          </div>
                        )}
                      </div>
                    </Link>
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
        )}
      </AnimatePresence>
    </div>
  );
}
