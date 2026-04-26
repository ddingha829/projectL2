import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/app/actions/notifications";
import styles from "./activities.module.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "활동 | 티끌 Ticgle",
  description: "회원님의 게시물에 대한 새로운 소식을 확인하세요.",
};

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const notifications = await getNotifications();

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
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>활동</h1>
        <div className={styles.categoryFilters}>
          <button className={`${styles.filterBtn} ${styles.active}`}>전체</button>
          <button className={styles.filterBtn}>좋아요</button>
          <button className={styles.filterBtn}>댓글</button>
          <button className={styles.filterBtn}>멘션</button>
        </div>
      </header>

      <div className={styles.list}>
        {notifications.length > 0 ? notifications.map((n) => (
          <Link 
            key={n.id} 
            href={`/post/db-${n.post_id}${n.type.includes('comment') ? `#comment-${n.comment_id}` : ''}`}
            className={`${styles.item} ${!n.is_read ? styles.unreadItem : ''}`}
          >
            <div className={styles.dotArea}>
              {!n.is_read && <span className={styles.unreadDot} />}
            </div>
            <div className={styles.avatarArea}>
              {n.sender?.avatar_url ? (
                <img src={n.sender.avatar_url} alt="" className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder}>👤</div>
              )}
            </div>
            <div className={styles.contentArea}>
              <div className={styles.messageRow}>
                <span className={styles.senderName}>{n.sender?.display_name || '익명'}</span>
                <span className={styles.time}>{getTimeAgo(n.created_at)}</span>
              </div>
              <p className={styles.messageText}>{getTypeLabel(n)}</p>
              {n.content_preview && (
                <div className={styles.previewBox}>
                  {n.content_preview}
                </div>
              )}
            </div>
            {n.post?.image_url && (
              <div className={styles.thumbnailArea}>
                <img src={n.post.image_url} alt="" className={styles.thumbnail} />
              </div>
            )}
          </Link>
        )) : (
          <div className={styles.emptyState}>
            <p>새로운 활동 내역이 없습니다.</p>
          </div>
        )}
      </div>
    </main>
  );
}
