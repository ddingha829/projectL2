import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import PosterCard from "@/components/feed/PosterCard";
import { CATEGORY_MAP } from "@/lib/constants/categories";

export const dynamic = 'force-dynamic';

export default async function FeaturesPage() {
  const supabase = await createClient();
  
  // 1. 관리자 여부 확인
  const { data: { user } } = await supabase.auth.getUser();
  let role = 'user';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    role = profile?.role || 'user';
  }
  const isAdmin = role === 'admin';

  // 2. 기획전 게시물 조회 (is_feature = true 이거나 카테고리가 feature인 경우)
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, author:profiles!author_id(display_name, avatar_url), comments(count)')
    .or('is_feature.eq.true,category.eq.feature')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch features error:', error);
  }

  const CATEGORY_LABELS: Record<string, string> = {
    movie: "영화", book: "책", game: "게임", restaurant: "맛집", 
    travel: "여행", exhibition: "전시회", other: "기타", notice: "공지사항"
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.subTitle}>Wooga Premium</span>
          <h1 className={styles.title}>기획전 (Features)</h1>
          <p className={styles.description}>우가우가 에디터들이 엄선한 특별한 주제의 리뷰 컬렉션</p>
        </div>
        
        {isAdmin && (
          <Link href="/write?is_feature=true" className={styles.writeBtn}>
            ✨ 새 기획전 작성
          </Link>
        )}
      </header>

      <div className={styles.content}>
        {!posts || posts.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📭</span>
            <p>등록된 게시물이 없습니다.</p>
            {isAdmin && <p className={styles.emptyHint}>상단의 버튼을 눌러 첫 번째 기획전을 등록해보세요!</p>}
          </div>
        ) : (
          <div className={styles.grid}>
            {posts.map((post) => (
              <PosterCard 
                key={post.id}
                id={`db-${post.id}`}
                category={CATEGORY_LABELS[post.category] || post.category}
                title={post.title}
                imageUrl={post.image_url}
                displayDate={new Date(post.created_at).toLocaleDateString('ko-KR')}
                likes={post.likes_count || 0}
                comments={post.comments?.[0]?.count || 0}
                author={{
                   id: post.author_id,
                   name: post.author?.display_name || '에디터',
                   avatar: post.author?.avatar_url || '👤',
                   color: '#204bb8'
                }}
                isPublic={post.is_public}
                aspectRatio="default"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
