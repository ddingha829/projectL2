import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { MOCK_POSTS } from "@/app/page";
import PostInteractions from "./PostInteractions";
import HeroToggleBtn from "./HeroToggleBtn";
import PostManageBtns from "./PostManageBtns";
import ContentSegmenter from "./ContentSegmenter";
import ShareBtn from "./ShareBtn";
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

const SCHEMA_TYPE_MAP: Record<string, string> = {
  movie: "Movie",
  book: "Book",
  game: "VideoGame",
  restaurant: "Restaurant",
  exhibition: "Event",
  travel: "LocalBusiness",
  other: "Product",
  // 한글 키 대응
  "영화": "Movie",
  "책": "Book",
  "게임": "VideoGame",
  "맛집": "Restaurant",
  "전시회": "Event",
  "여행": "LocalBusiness",
  "기타": "Product"
};

// Cached post fetching for both Metadata and Page content
const getPost = cache(async (id: string) => {
  const supabase = await createClient();
  const isDbPost = id.startsWith('db-');
  const actualId = isDbPost ? id.replace('db-', '') : id;

  let post;
  let commentsData: any[] = [];
  const isNumericId = /^\d+$/.test(id);

  if (!isNumericId && !isDbPost) {
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
    // Determine query filter
    const query = supabase
      .from('posts')
      .select('*, serial_id, author:profiles!author_id(id, display_name, avatar_url, bio, bullets)');
    
    if (isNumericId) {
      query.eq('serial_id', parseInt(id));
    } else {
      query.eq('id', actualId);
    }

    const { data: dbPost, error } = await query.single();

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

    const [dbCommentsRes, prevPostRes, nextPostRes] = await Promise.all([
      supabase
        .from('comments')
        .select('*, user:profiles(id, display_name, avatar_url)')
        .eq('post_id', dbPost.id) 
        .order('created_at', { ascending: false }),
      supabase
        .from('posts')
        .select('id')
        .lt('created_at', post.created_at)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('posts')
        .select('id')
        .gt('created_at', post.created_at)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
    ]);
      
    if (dbCommentsRes.data) commentsData = dbCommentsRes.data;
    post.prevId = prevPostRes.data?.id;
    post.nextId = nextPostRes.data?.id;
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
    title: post.title,
    description: description,
    openGraph: {
      title: post.title,
      description: description,
      url: `https://ticgle.kr/post/${id}`,
      type: 'article',
      publishedTime: post.created_at,
      authors: [post.author?.display_name],
      section: post.category,
      images: [
        {
          url: post.image_url || '/preview.png',
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
      images: [post.image_url || '/preview.png'],
    },
    alternates: {
      canonical: post.serial_id 
        ? `https://ticgle.kr/post/${post.serial_id}` 
        : `https://ticgle.kr/post/db-${post.id}`,
    },
  };
}

export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const supabase = await createClient();

  // 1. 최상단 데이터 요청 병렬화 (포스트, 유저 정보, 어드민 여부 동시 요청)
  const [data, { data: { user } }, { isAdmin }] = await Promise.all([
    getPost(id),
    supabase.auth.getUser(),
    getAdminStatus()
  ]);

  if (!data || !data.post) notFound();
  const { post, comments: commentsData, isDbPost, actualId } = data;

  // [신규] 비밀글 접근 권한 관리
  // 1. 글이 존재하지 않으면 404
  if (!post) notFound();

  // 2. 비밀글(is_public: false)인 경우 검증
  if (post.is_public === false) {
    const isAuthor = user && (user.id === post.author?.id || user.id === post.author_id);
    
    // 작성자도 아니고 관리자도 아니면 404 (보안상 403보다 404 권장)
    if (!isAuthor && !isAdmin) {
      notFound();
    }
  }

  // Increment Views (side effect)
  if (isDbPost) {
    // Moved to client-side in PostInteractions.tsx for deduplication
  }
  
  let currentUserRole = 'user'
  let isLiked = false;

  // 2. 유저 특화 데이터 요청 병렬화 (권한, 좋아요 여부 동시 요청)
  if (user) {
    const rolePromise = supabase.from('profiles').select('role').eq('id', user.id).single();
    const likePromise = isDbPost 
      ? supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', user.id).single()
      : Promise.resolve({ data: null });

    const [{ data: profile }, { data: likeRecord }] = await Promise.all([rolePromise, likePromise]);
    
    currentUserRole = profile?.role || 'user';
    if (likeRecord) isLiked = true;
  }

  // JSON-LD Structured Data
  const schemaType = SCHEMA_TYPE_MAP[post.category_id || post.category] || "Product";
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": post.review_subject ? "Review" : "BlogPosting",
    "headline": post.title,
    "image": post.image_url ? [post.image_url] : [],
    "datePublished": post.created_at,
    "author": {
      "@type": "Person",
      "name": post.authorProfile?.display_name || post.author?.display_name,
    },
    "publisher": {
      "@type": "Organization",
      "name": "Ticgle",
      "logo": {
        "@type": "ImageObject",
        "url": "https://ticgle.kr/logo.png"
      }
    },
    "description": post.content.replace(/<[^>]+>/g, '').substring(0, 160).trim(),
    ...(post.review_subject ? {
      "itemReviewed": {
        "@type": schemaType,
        "name": post.review_subject,
        "image": post.image_url || "https://ticgle.kr/logo.png",
        ...(schemaType === "Restaurant" || schemaType === "LocalBusiness" ? {
          "address": {
             "@type": "PostalAddress",
             "streetAddress": "N/A",
             "addressLocality": "South Korea",
             "addressCountry": "KR"
          }
        } : {})
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": post.review_rating,
        "bestRating": "5",
        "worstRating": "1"
      }
    } : {})
  };

  return (
    <div className={styles.container}>
      {/* [신규] 수동 리뷰 카드를 위한 대표 이미지 동적 주입 (좌측 사진 영역 전용) */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* 1. 클래스 기반 선택자 */
        .ql-review-card[data-place-id="manual"] .review-card-map,
        .ql-review-card[data-place-id="manual"] .review-card-manual-photo-area {
          background-image: url('${post.image_url || 'https://ticgle.kr/logo.png'}') !important;
          background-size: cover !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          width: 220px !important;
          min-width: 220px !important;
          height: 220px !important;
          display: block !important;
          border-right: 1px solid #f1f5f9 !important;
        }
        /* 2. 속성 기반 무적 선택자 보완 */
        div[data-place-id="manual"] .review-card-map {
          background-image: url('${post.image_url || ''}') !important;
          width: 220px !important;
          min-width: 220px !important;
        }
        /* 3. 메인 배경 초기화 */
        .ql-review-card[data-place-id="manual"] .review-card-main {
          background-image: none !important;
          background-color: white !important;
          display: flex !important;
        }
      `}} />

      {/* Structured Data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className={styles.topNav}>
        <Link href="/" className={styles.backBtn}>← 목록으로 돌아가기</Link>
        
        <div className={styles.topNavRight}>
          {isAdmin && isDbPost && (
            <HeroToggleBtn postId={post.id} initialIsHero={post.is_hero || false} />
          )}

          <ShareBtn 
            title={post.title} 
            imageUrl={post.image_url} 
            description={post.content
              ?.replace(/<br\s*\/?>/gi, '\n')
              ?.replace(/<\/p>/gi, '\n')
              ?.replace(/<[^>]+>/g, '')
              ?.replace(/&nbsp;/gi, ' ')
              ?.trim()
              .substring(0, 65) + '...'
            }
          />
          
          <PostManageBtns 
            postId={post.id} 
            displayId={id}
            authorId={post.author?.id || post.author_id} 
            currentUserId={user?.id || ''} 
            role={currentUserRole || 'user'} 
          />
        </div>
      </div>
      
      <article className={styles.post}>
        <header className={styles.header}>
          <div className={styles.meta}>
            <span className={styles.category}>{post.category}</span>
            <span className={styles.dot}>•</span>
            <span className={styles.date}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
            <Link href={`/?author=${post.author?.id}`} className={styles.authorBadgeDetail}>
              {post.author?.display_name || post.author?.name || '익명 작가'}
            </Link>
            <span className={styles.dot}>•</span>
            <span className={styles.viewCountDetail}>조회수 {post.views?.toLocaleString()}</span>
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
            
          </div>
          
          <h1 className={styles.title}>{post.title}</h1>
        </header>

        {post.show_main_image !== false && post.image_url && (
          <div className={styles.mainImageWrapper}>
            <a href={post.image_url} target="_blank" rel="noopener noreferrer">
              <Image 
                src={post.image_url} 
                alt={post.title} 
                className={styles.mainImage} 
                width={1200}
                height={800}
                priority
                sizes="(max-width: 768px) 100vw, 1200px"
                style={{ cursor: 'zoom-in' }} 
                title="클릭하여 원본 이미지 보기" 
              />
            </a>
          </div>
        )}
        
        <ContentSegmenter content={post.content} comments={commentsData} />
        

        {/* Editor Profile Card */}
        {post.authorProfile && (
          <div className={styles.authorCardWrapper}>
            <div className={styles.authorCardHeader}>
              <span>TICGLER PROFILE</span>
              <Link href={`/requests/${post.authorProfile.id}`} className={styles.headerRequestLink}>
                티끌러님, 이것도 리뷰해주세요! 💬
              </Link>
            </div>
            <div className={styles.authorCardContent}>
                <div className={styles.authorAvatarArea}>
                   <div className={styles.authorAvatarLarge}>
                      <Image 
                        src={(post.authorProfile.avatar_url && (post.authorProfile.avatar_url.startsWith('http') || post.authorProfile.avatar_url.startsWith('/'))) ? post.authorProfile.avatar_url : "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                        alt={post.authorProfile.display_name} 
                        width={220}
                        height={220}
                        className={styles.authorAvatarImg}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                   </div>
                </div>
              <div className={styles.authorDetailsArea}>
                <Link href={`/?author=${post.authorProfile.id}`} className={styles.authorNameLink}>
                  {post.authorProfile.display_name}
                </Link>
                <p className={styles.authorBio}>{post.authorProfile.bio || "생동감 넘치는 리뷰를 작성하는 티끌러입니다."}</p>
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
          postId={post.id} 
          authorId={post.author?.id || post.author_id}
          initialLikes={post.likes_count || 0} 
          initialComments={commentsData} 
          user={user} 
          isAdmin={isAdmin}
          prevId={post.prevId}
          nextId={post.nextId}
        />
      </article>
    </div>
  );
}
