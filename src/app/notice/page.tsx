import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import styles from "./notice.module.css";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "공지사항",
  description: "우가우가 매거진의 새로운 소식과 안내사항을 확인하세요.",
};

export default async function NoticeListPage() {
  const supabase = await createClient();
  
  // 1. Fetch notices
  const { data: notices, error } = await supabase
    .from('posts')
    .select('*, author:profiles!author_id(display_name)')
    .eq('category', 'notice')
    .order('created_at', { ascending: false });

  // 2. Fetch current user role
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.role === 'admin';
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>📢 공지사항</h1>
        {isAdmin && (
          <Link href="/write?category=notice" className={styles.writeBtn}>
            글쓰기
          </Link>
        )}
      </header>

      <div className={styles.noticeList}>
        {notices && notices.length > 0 ? (
          notices.map((notice) => (
            <Link key={notice.id} href={`/post/db-${notice.id}`} className={styles.noticeItem}>
              <div className={styles.noticeMain}>
                <span className={styles.noticeId}>#{notice.id.toString().slice(-4)}</span>
                <h3 className={styles.noticeTitle}>{notice.title}</h3>
              </div>
              <div className={styles.noticeMeta}>
                <span className={styles.noticeAuthor}>{notice.author?.display_name || "관리자"}</span>
                <span className={styles.noticeDate}>
                  {new Date(notice.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className={styles.empty}>등록된 공지사항이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
