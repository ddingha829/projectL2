import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { MOCK_POSTS } from "@/app/page";
import PostInteractions from "./PostInteractions";
import HeroToggleBtn from "./HeroToggleBtn";
import PostManageBtns from "./PostManageBtns";
import { getAdminStatus } from "@/app/actions/hero";
import styles from "./page.module.css";

const CATEGORY_MAP: Record<string, string> = {
  movie: "영화", 
  book: "책", 
  game: "게임", 
  restaurant: "맛집", 
  other: "기타",
  travel: "여행",
  exhibition: "전시회"
};

// Cached post fetching for both Metadata and Page content
const getPost = cache(async (id: string) => {
  const supabase = await createClient();
  const isDbPost = id.startsWith('db-');
  const actualId = isDbPost ? id.replace('db-', '') : id;

  let post;
  let commentsData: any[] = [];

  if (!isDbPost) {
    const mockPost = MOCK_POSTS.find(p => p.id === id);
    if (!mockPost) return null;
    
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
    const { data: dbPost, error } = await supabase
      .from('posts')
      .select('*, author:profiles!author_id(id, display_name, avatar_url, bio, bullets)')
      .eq('id', actualId)
      .single();

    if (error || !dbPost) {
      console.error('Post fetch error:', error);
      return null;
    }

    post = {
       ...dbPost,
       category: CATEGORY_MAP[dbPost.category] || dbPost.category,
       is_hero: dbPost.is_hero || false,
       is_public: dbPost.is_public,
       author: {
         id: dbPost.author?.id || dbPost.author_id || 'db-anon',
         display_name: dbPost.author?.display_name || '활발한 작가',
         avatar_url: dbPost.author?.avatar_url || '👤'
       },
       authorProfile: dbPost.author
    };

    const { data: dbComments } = await supabase
      .from('comments')
      .select('*, user:profiles(id, display_name, avatar_url)')
      .eq('post_id', actualId) 
      .order('created_at', { ascending: false });
      
    if (dbComments) commentsData = dbComments;
    
    // Fetch Prev/Next Posts
    const { data: prevPost } = await supabase
      .from('posts')
      .select('id')
      .lt('created_at', post.created_at)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    const { data: nextPost } = await supabase
      .from('posts')
      .select('id')
      .gt('created_at', post.created_at)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
      
    post.prevId = prevPost?.id;
    post.nextId = nextPost?.id;
  }

  return { post, comments: commentsData, isDbPost, actualId };
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getPost(id);
  
  if (!data) return { title: '게시물을 찾을 수 없습니다' };
  
  const { post } = data;
  const description = post.content.replace(/<[^>]+>/g, '').substring(0, 160).trim();
  
  return {
    title: `${post.title} | 우가우가`,
    description: description,
    openGraph: {
      title: post.title,
      description: description,
      url: `https://project-l2.vercel.app/post/${id}`,
      type: 'article',
      publishedTime: post.created_at,
      authors: [post.author?.display_name],
      section: post.category,
      images: [
        {
          url: post.image_url || '/logo.png',
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: description,
      images: [post.image_url || '/logo.png'],
    },
  };
}

export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPost(id);
  
  if (!data) notFound();
  
  const { post, comments: commentsData, isDbPost, actualId } = data;
  const supabase = await createClient();

  // Increment Views (side effect, done only on page load)
  if (isDbPost) {
    supabase.rpc('increment_post_views', { post_id: actualId }).then();
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { isAdmin } = await getAdminStatus();
  
  let currentUserRole = 'user'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    currentUserRole = profile?.role || 'user'
  }

  // Check if current user has liked this post
  let isLiked = false;
  if (user && isDbPost) {
    const { data: likeRecord } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', actualId)
      .eq('user_id', user.id)
      .single();
    if (likeRecord) isLiked = true;
  }

  // JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": post.review_subject ? "Review" : "BlogPosting",
    "headline": post.title,
    "image": post.image_url,
    "datePublished": post.created_at,
    "author": {
      "@type": "Person",
      "name": post.author?.display_name,
    },
    "publisher": {
      "@type": "Organization",
      "name": "WoogaWooga",
      "logo": {
        "@type": "ImageObject",
        "url": "https://project-l2.vercel.app/logo.png"
      }
    },
    "description": post.content.replace(/<[^>]+>/g, '').substring(0, 160).trim(),
    ...(post.review_subject ? {
      "itemReviewed": {
        "@type": "Thing",
        "name": post.review_subject
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": post.review_rating / 2, // Assuming scale is 10, JSON-LD standard is often 1-5
        "bestRating": "5"
      }
    } : {})
  };

  return (
    <div className={styles.container}>
      {/* Structured Data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <Link href="/" className={styles.backBtn}>← 목록으로 돌아가기</Link>
      
      <article className={styles.post}>
        <header className={styles.header}>
          <div className={styles.meta}>
            <span className={styles.category}>{post.category}</span>
            <span className={styles.dot}>•</span>
            <span className={styles.date}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
            <Link href={`/?author=${post.author?.id}`} className={styles.authorBadgeDetail}>
              {post.author?.display_name || post.author?.name || '익명 작가'}
            </Link>
            {post.is_public === false && (
              <span style={{ 
                background: '#ea4335', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '4px', 
                fontSize: '0.7rem', 
                fontWeight: 800,
                marginLeft: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🔒 비공개
              </span>
            )}
            
            <div style={{ flex: 1 }} /> {/* Spacer */}
            
            <PostManageBtns 
              postId={actualId} 
              authorId={post.author?.id || post.author_id} 
              currentUserId={user?.id || ''} 
              role={currentUserRole || 'user'} 
            />
          </div>
          
          <h1 className={styles.title}>{post.title}</h1>
        </header>

        {post.image_url && (
          <div className={styles.mainImageWrapper}>
            <img src={post.image_url} alt={post.title} className={styles.mainImage} />
          </div>
        )}
        
        <div className={styles.content} dangerouslySetInnerHTML={{ __html: post.content }} />
        
        {/* [신규] 에디터의 한줄평 섹션 */}
        {post.review_subject && (
          <div className={styles.postReviewBox}>
            <div className={styles.reviewHeader}>
              <h3 className={styles.reviewSubject}>{post.review_subject}</h3>
              <div className={styles.reviewRatingBox}>
                <div className={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} style={{ color: (post.review_rating >= i * 2) ? '#ff4d4d' : '#ddd' }}>★</span>
                  ))}
                </div>
                <span className={styles.reviewScore}>{post.review_rating}</span>
              </div>
            </div>
            <p className={styles.reviewCommentText}>{post.review_comment}</p>
          </div>
        )}

        {/* Editor Profile Card */}
        {post.authorProfile && (
          <div className={styles.authorCardWrapper}>
            <div className={styles.authorCardHeader} style={{ background: post.authorProfile.color || '#204bb8' }}>
              <span>EDITOR</span>
              <Link href={`/requests/${post.authorProfile.id}`} className={styles.headerRequestLink}>
                에디터님, 이것도 리뷰해주세요! 💬
              </Link>
            </div>
            <div className={styles.authorCardContent}>
              <div className={styles.authorAvatarArea}>
                <div className={styles.authorAvatarLarge}>
                   {post.authorProfile.avatar_url ? (
                     <img src={post.authorProfile.avatar_url} alt={post.authorProfile.display_name} />
                   ) : "👤"}
                </div>
              </div>
              <div className={styles.authorDetailsArea}>
                <Link href={`/?author=${post.authorProfile.id}`} className={styles.authorNameLink}>
                  {post.authorProfile.display_name}
                </Link>
                <p className={styles.authorBio}>{post.authorProfile.bio || "생동감 넘치는 리뷰를 작성하는 에디터입니다."}</p>
                {post.authorProfile.bullets && post.authorProfile.bullets.length > 0 && (
                  <div className={styles.authorBullets}>
                    {post.authorProfile.bullets.map((b: string, i: number) => (
                      <span key={i} className={styles.authorBullet}># {b}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={styles.separator} />

        {/* Interaction Bar with Prev/Next Navigation */}
        <PostInteractions 
          postId={actualId} 
          authorId={post.author?.id || post.author_id}
          initialLikes={post.likes_count || 0} 
          initialComments={commentsData} 
          user={user} 
          prevId={post.prevId}
          nextId={post.nextId}
          initialIsLiked={isLiked}
        />
      </article>
    </div>
  );
}
