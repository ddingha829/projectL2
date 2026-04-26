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

export default async function ActivitiesPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const tab = (await searchParams).tab as string || 'all';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const allNotifications = await getNotifications();
  
  // Filtering logic
  const filteredNotifications = allNotifications.filter((n: any) => {
    if (tab === 'all') return true;
    if (tab === 'likes') return n.type === 'like_post' || n.type === 'like_comment';
    if (tab === 'comments') return n.type === 'comment_post' || n.type === 'reply_comment';
    if (tab === 'mentions') return n.type === 'mention' || n.type === 'new_post_subscription'; // Mapping subscription to mention for now or just placeholder
    return true;
  });

  const notifications = filteredNotifications;

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

  // Grouping logic
  const groupNotifications = (notifs: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    return notifs.reduce((groups: any, n: any) => {
      const date = new Date(n.created_at);
      let groupName = "이전 활동";
      
      if (date >= today) groupName = "오늘";
      else if (date >= yesterday) groupName = "어제";
      else if (date >= lastWeek) groupName = "최근 7일";
      
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(n);
      return groups;
    }, {});
  };

  const groupedNotifications = groupNotifications(notifications);
  const groupOrder = ["오늘", "어제", "최근 7일", "이전 활동"];

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>활동</h1>
        <div className={styles.categoryFilters}>
          <Link href="/activities?tab=all" className={`${styles.filterBtn} ${tab === 'all' ? styles.active : ''}`}>전체</Link>
          <Link href="/activities?tab=likes" className={`${styles.filterBtn} ${tab === 'likes' ? styles.active : ''}`}>좋아요</Link>
          <Link href="/activities?tab=comments" className={`${styles.filterBtn} ${tab === 'comments' ? styles.active : ''}`}>댓글</Link>
          <Link href="/activities?tab=mentions" className={`${styles.filterBtn} ${tab === 'mentions' ? styles.active : ''}`}>멘션</Link>
        </div>
      </header>

      <div className={styles.list}>
        {notifications.length > 0 ? (
          groupOrder.map(groupName => {
            const notifs = groupedNotifications[groupName];
            if (!notifs || notifs.length === 0) return null;

            return (
              <section key={groupName} className={styles.groupSection}>
                <h2 className={styles.groupTitle}>{groupName}</h2>
                {notifs.map((n: any) => (
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
                          {formatContent(n.content_preview)}
                        </div>
                      )}
                    </div>
                    {n.post?.image_url && (
                      <div className={styles.thumbnailArea}>
                        <img src={n.post.image_url} alt="" className={styles.thumbnail} />
                      </div>
                    )}
                  </Link>
                ))}
              </section>
            );
          })
        ) : (
          <div className={styles.emptyState}>
            <p>새로운 활동 내역이 없습니다.</p>
          </div>
        )}
      </div>
    </main>
  );
}
