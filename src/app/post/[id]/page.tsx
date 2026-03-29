import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MOCK_POSTS } from "@/app/page";
import PostInteractions from "./PostInteractions";
import HeroToggleBtn from "./HeroToggleBtn";
import PostManageBtns from "./PostManageBtns";
import { getAdminStatus } from "@/app/actions/hero";
import styles from "./page.module.css";

export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Robust ID detection: Our DB posts are prefixed with 'db-' in the home feed
  const isDbPost = id.startsWith('db-');
  const actualId = isDbPost ? id.replace('db-', '') : id;
  
  let post;
  let commentsData: any[] = [];
  
  const CATEGORY_MAP: Record<string, string> = {
    movie: "영화", 
    book: "책", 
    game: "게임", 
    restaurant: "맛집", 
    other: "기타",
    travel: "여행",
    exhibition: "전시회"
  };

  if (!isDbPost) {
    // Handle Mock Posts
    const mockPost = MOCK_POSTS.find(p => p.id === id);
    if (!mockPost) notFound();
    
    post = {
       id: mockPost.id,
       category: CATEGORY_MAP[mockPost.categoryId] || mockPost.categoryId,
       title: mockPost.title,
       content: mockPost.content,
       image_url: mockPost.imageUrl,
       created_at: mockPost.date,
       likes_count: mockPost.likes,
       author: {
           id: mockPost.author.id,
           display_name: mockPost.author.name,
           avatar_url: mockPost.author.avatar
       }
    };
    commentsData = [
      { id: "c1", content: "정말 공감되는 리뷰네요! 사진도 너무 예뻐요.", created_at: "2024-03-22T10:00:00Z", user: { display_name: "심쿵리뷰어" } },
      { id: "c2", content: "저도 여기 가봤는데 분위기 진짜 좋더라구요.", created_at: "2024-03-22T13:00:00Z", user: { display_name: "맛집탐험대" } }
    ];
  } else {
    // Live Supabase Fetch
    // Using explicit Join path profiles!author_id to match our Home Page fix
    const { data: dbPost, error } = await supabase
      .from('posts')
      .select('*, author:profiles!author_id(id, display_name, avatar_url)')
      .eq('id', actualId)
      .single();

    if (error || !dbPost) {
      console.error('Post detail fetch error:', error);
      notFound();
    }
    
    post = {
       ...dbPost,
       category: CATEGORY_MAP[dbPost.category] || dbPost.category,
       is_hero: dbPost.is_hero || false,
       author: {
         id: dbPost.author?.id || dbPost.author_id || 'db-anon',
         display_name: dbPost.author?.display_name || '활발한 작가',
         avatar_url: dbPost.author?.avatar_url || '👤'
       }
    };

    const { data: dbComments } = await supabase
      .from('comments')
      .select('*, user:profiles(id, display_name, avatar_url)')
      .eq('post_id', actualId) 
      .order('created_at', { ascending: false });
      
    if (dbComments) commentsData = dbComments;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { isAdmin } = await getAdminStatus();

  // 현재 유저 role 조회 (수정/삭제 버튼 표시 여부)
  let currentUserRole = 'user'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    currentUserRole = profile?.role || 'user'
  }

  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backBtn}>← 목록으로 돌아가기</Link>
      
      <article className={styles.post}>
        <header className={styles.header}>
          <div className={styles.meta}>
            <span className={styles.category}>{post.category}</span>
            <span className={styles.dot}>•</span>
            <span className={styles.author}>{post.author?.display_name || post.author?.name || '익명 작가'}</span>
            <span className={styles.dot}>•</span>
            <span className={styles.date}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
          </div>
          <h1 className={styles.title}>{post.title}</h1>
        </header>

        {post.image_url && (
          <div className={styles.mainImageWrapper}>
            <img src={post.image_url} alt={post.title} className={styles.mainImage} />
          </div>
        )}
        
        <div className={styles.content} dangerouslySetInnerHTML={{ __html: post.content }} />
        
        <div className={styles.separator} />

        {/* Admin-only: Hero designation button (DB posts only) */}
        {isAdmin && isDbPost && (
          <HeroToggleBtn postId={actualId} initialIsHero={post.is_hero || false} />
        )}

        {/* 수정/삭제 버튼 (DB 게시물 + 권한 있는 유저만) */}
        {isDbPost && user && (currentUserRole === 'admin' || currentUserRole === 'editor') && (
          <PostManageBtns
            postId={actualId}
            authorId={post.author?.id || post.author_id || ''}
            currentUserId={user.id}
            role={currentUserRole}
          />
        )}

        <PostInteractions 
          postId={actualId} 
          authorId={post.author?.id || post.author_id}
          initialLikes={post.likes_count || 0} 
          initialComments={commentsData} 
          user={user} 
        />
      </article>
    </div>
  );
}
