"use client";
 
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import styles from "./page.module.css";
import Image from "next/image";
import HeroCard from "@/components/feed/HeroCard";
import PosterCard from "@/components/feed/PosterCard";
import { AUTHORS } from "@/lib/constants/authors";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
const ReviewRequest = dynamic(() => import("@/components/feed/ReviewRequest"), { ssr: false });
import SkeletonCard from "@/components/feed/SkeletonCard";

// [최적화] 하단 섹션들을 동적 임포트하여 초기 JS 번들 크기를 줄이고 로딩 속도 개선
const FeatureSection = dynamic(() => import("@/components/sections/FeatureSection").then(mod => mod.FeatureSection), { 
  loading: () => <div style={{ height: '300px', background: '#f5f5f5', borderRadius: '12px', margin: '20px 0' }} />,
  ssr: true 
});
const ReviewsSection = dynamic(() => import("@/components/sections/ReviewsSection").then(mod => mod.ReviewsSection), { 
  loading: () => <div style={{ height: '200px', background: '#f5f5f5', borderRadius: '12px', margin: '20px 0' }} />,
  ssr: true 
});
const EditorsSection = dynamic(() => import("@/components/sections/EditorsSection").then(mod => mod.EditorsSection), { 
  loading: () => <div style={{ height: '250px', background: '#f5f5f5', borderRadius: '12px', margin: '20px 0' }} />,
  ssr: true 
});

const MOCK_REVIEWS = [
  { id: 'm1', subject: '크라임 101', rating: 6, comment: '반전은 보이나 몰입감 부족', authorName: '황수정 티끌러' },
  { id: 'm2', subject: '샷 콜러', rating: 7, comment: '연기가 돋보이는 처절한 사투', authorName: '박펜 티끌러' },
  { id: 'm3', subject: '파묘', rating: 8, comment: '한국적 오컬트 정수, 사운드 압권', authorName: '김철수 티끌러' },
  { id: 'm4', subject: '듄: 파트 2', rating: 10, comment: '장엄한 아이맥스 시각적 황홀경', authorName: '이동진 티끌러' },
  { id: 'm5', subject: '서울의 봄', rating: 9, comment: '실화의 묵직한 울림, 긴장감 최고', authorName: '조성우 티끌러' }
];

const stripHtml = (html: string) => {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
};

interface HomeContentProps {
  heroPosts: any[];
  otherPosts: any[];
  allPosts: any[];
  displayTitle: string;
  animationKey: string;
  isInitialVisit: boolean;
  recentReviews?: {
    id: string;
    subject: string;
    rating: number;
    comment: string;
    date: string;
    authorName: string;
  }[];
  featurePosts?: any[];
  userProfile?: {
    preferred_view_type: string | null;
    preferred_view_pc: string | null;
    preferred_view_mobile: string | null;
    preferred_m_cols: number | null;
    preferred_d_cols: number | null;
  } | null;
  isMobileServer?: boolean;
  initialViewType?: "card" | "magazine";
  editors?: any[];
}

export default function HomeContent({ 
  heroPosts,
  otherPosts,
  allPosts,
  displayTitle, 
  animationKey,
  isInitialVisit: _isInitialVisit,
  recentReviews = [],
  featurePosts = [],
  userProfile,
  isMobileServer = false,
  initialViewType,
  editors = []
}: HomeContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const rawAuthor = searchParams.get("author");
  const searchFilter = searchParams.get("search");
  const isViewMoreFromUrl = searchParams.get("view") === "all";

  // 1. Label Map (Define first to use in Memo)
  const CATEGORY_LABEL_MAP: Record<string, string> = useMemo(() => ({
    'all': '전체',
    'restaurant': '맛집',
    'travel': '여행',
    'movie': '영화',
    'game': '게임',
    'book': '책',
    'exhibition': '전시회',
    'other': '기타'
  }), []);

  // 2. Safe Author Parsing
  const processedAuthorFilter = useMemo(() => {
    if (!rawAuthor) return null;
    try {
      return rawAuthor.includes('%') ? decodeURIComponent(rawAuthor) : rawAuthor;
    } catch { return rawAuthor; }
  }, [rawAuthor]);

  // 3. Memoized Author Data
  const authorData = useMemo(() => {
    if (!processedAuthorFilter) return null;
    const staticAuth = AUTHORS.find(a => String(a.id) === processedAuthorFilter || a.name === processedAuthorFilter);
    if (staticAuth) return staticAuth;
    const dbAuth = (editors || []).find(ed => (ed && String(ed.id) === processedAuthorFilter) || (ed && ed.display_name === processedAuthorFilter));
    if (dbAuth) {
      return {
        id: dbAuth.id,
        name: dbAuth.display_name || dbAuth.name || processedAuthorFilter,
        avatar: dbAuth.avatar_url || dbAuth.avatar || "/default-avatar.png",
        bio: dbAuth.bio || "티끌 매거진 에디터입니다.",
        role: dbAuth.role === 'admin' ? '운영자' : '티끌러',
        description: { bio: dbAuth.bio, bullets: dbAuth.bullets }
      };
    }
    const postWithAuth = allPosts.find(p => (p.author && (String(p.author_id) === processedAuthorFilter || String(p.author.id) === processedAuthorFilter || p.author.name === processedAuthorFilter)));
    if (postWithAuth) {
      return {
        id: postWithAuth.author?.id || processedAuthorFilter,
        name: postWithAuth.author?.name || postWithAuth.authorProfile?.display_name || processedAuthorFilter,
        avatar: postWithAuth.author?.avatar || postWithAuth.authorProfile?.avatar_url || "/default-avatar.png",
        bio: postWithAuth.author?.bio || postWithAuth.authorProfile?.bio || "티끌 매거진 에디터입니다.",
        role: "Editor",
        description: { bio: postWithAuth.author?.bio, bullets: [] }
      };
    }
    return { id: processedAuthorFilter, name: processedAuthorFilter, avatar: "/default-avatar.png", bio: "티끌 매거진 에디터입니다.", role: "Editor", description: { bio: "", bullets: [] } };
  }, [processedAuthorFilter, editors, allPosts]);

  // 4. Main Filtering Engine (Performance Boost)
  const filteredPosts = useMemo(() => {
    let result = [...allPosts];
    if (categoryFilter && categoryFilter !== 'all') {
      const label = CATEGORY_LABEL_MAP[categoryFilter];
      result = result.filter(p => p.categoryId === categoryFilter || p.category_id === categoryFilter || p.category === categoryFilter || (label && p.category === label));
    }
    if (processedAuthorFilter && processedAuthorFilter !== 'all') {
      result = result.filter(p => String(p.author?.id) === processedAuthorFilter || String(p.author_id) === processedAuthorFilter || p.author?.name === processedAuthorFilter);
    }
    if (searchFilter) {
      const lowerQuery = searchFilter.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(lowerQuery) || p.content.toLowerCase().includes(lowerQuery));
    }
    return result;
  }, [allPosts, categoryFilter, processedAuthorFilter, searchFilter, CATEGORY_LABEL_MAP]);

  // Derived Values
  const isFiltered = !!(categoryFilter && categoryFilter !== 'all') || !!processedAuthorFilter || !!searchFilter;
  const isViewMore = isViewMoreFromUrl;
  const isInitialVisit = !categoryFilter && !processedAuthorFilter && !searchFilter && !isViewMore;

  // 5. States
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const [heroIndex, setHeroIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<'next' | 'prev'>('next');
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showMobileFab, setShowMobileFab] = useState(false);
  const reviewRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const prevWidth = useRef(0);

  // 6. Helpers
  const updateParam = useCallback((key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, val);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const scrollReviews = (direction: 'left' | 'right') => {
    if (!reviewRef.current) return;
    const scrollAmount = 350;
    reviewRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  const nextHero = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setSlideDir('next');
    setHeroIndex((prev) => (prev + 1) % heroPosts.length);
  };
  const prevHero = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setSlideDir('prev');
    setHeroIndex((prev) => (prev - 1 + heroPosts.length) % heroPosts.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !heroPosts) return;
    const distance = touchStart - touchEnd;
    if (distance > 30) nextHero();
    else if (distance < -30) prevHero();
    setTouchStart(null); setTouchEnd(null);
  };

  // 7. Effects
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMob = isMobileServer || window.innerWidth <= 768;
    setIsMobile(isMob);
    setHasInitialized(true); // Just mark as initialized without forced redirect
  }, [isMobileServer]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width <= 768;
      if (mobile !== (prevWidth.current <= 768)) {
        setIsMobile(mobile);
        if (mobile) {
          const params = new URLSearchParams(window.location.search);
          params.set("viewType", "card");
          router.replace(`?${params.toString()}`, { scroll: false });
        }
      }
      prevWidth.current = width;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [router]);

  useEffect(() => {
    setCurrentPage(0);
    const vTypeTmp = searchParams.get("viewType") || initialViewType || (isMobile ? "card" : "magazine");
    const dColsTmp = parseInt(searchParams.get("dCols") || "4");
    setVisibleCount(isMobile ? 6 : (dColsTmp === 4 ? 8 : 6));
  }, [animationKey, categoryFilter, processedAuthorFilter, searchFilter, isViewMore, isMobile, searchParams, initialViewType]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: isMobile ? 'instant' : 'smooth' });
  }, [isViewMore, currentPage, isMobile]);

  useEffect(() => {
    if (!heroPosts || heroPosts.length <= 1 || isHeroPaused) return;
    const interval = setInterval(nextHero, isMobile ? 4000 : 5000); 
    return () => clearInterval(interval);
  }, [heroPosts?.length, isHeroPaused, isMobile, heroIndex]);

  const showFullGrid = useMemo(() => {
    // If we have any of these, we MUST show the full grid
    return isFiltered || isViewMore;
  }, [isFiltered, isViewMore]);
  
  const paginatedData = useMemo(() => filteredPosts, [filteredPosts]);
  const displayPosts = useMemo(() => showFullGrid ? paginatedData.slice(0, visibleCount) : otherPosts.slice(0, 4), [showFullGrid, paginatedData, visibleCount, otherPosts]);

  useEffect(() => {
    if (!showFullGrid) return;
    const dColsTmp = parseInt(searchParams.get("dCols") || "4");
    const pageSize = isMobile ? 6 : (dColsTmp === 4 ? 8 : 6);
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount(prev => Math.min(prev + pageSize, paginatedData.length));
    }, { threshold: 0.1, rootMargin: '300px' });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [paginatedData.length, showFullGrid, visibleCount, isMobile, searchParams]);

  useEffect(() => {
    const handleScroll = () => setShowMobileFab(window.scrollY > 15);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // URL 쿼리를 최우선으로, 그 다음 선호도, 그 다음 기본값
  const queryVType = searchParams.get("viewType");
  const vType = (queryVType || initialViewType || (isMobile ? "card" : "magazine")) as "card" | "magazine";
  const mobileGridCols = vType === 'magazine' ? 1 : parseInt(searchParams.get("mCols") || "2");
  const cardCols = parseInt(searchParams.get("dCols") || "4");

  return (
    <>
      <div className={styles.container}>
        {/* Branch 1: Home Page View (Mixed Sections) */}
        {!showFullGrid ? (
          <div className={styles.homeContainer}>
            {/* Hero Section */}
            <div 
              className={styles.heroWrapper}
              onMouseEnter={() => setIsHeroPaused(true)}
              onMouseLeave={() => setIsHeroPaused(false)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className={styles.desktopOnly}>
                <div className={styles.heroFrame}></div>
                <div 
                  className={styles.heroTrack} 
                  style={{ transform: `translateX(-${heroIndex * 100}%)` }}
                >
                  {heroPosts.map((post, index) => (
                    <div key={post.id} className={styles.heroSlideItem}>
                      <HeroCard {...post} heightRatio="2/3" showNav={false} isPriority={index === 0} />
                    </div>
                  ))}
                </div>
                {heroPosts.length > 1 && (
                  <div className={styles.heroNavFloating}>
                    <button className={styles.slideNavBtn} onClick={prevHero}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                    </button>
                    <div className={styles.heroDotsView}>
                      {heroPosts.map((_, idx) => (
                        <span 
                          key={idx} 
                          className={idx === heroIndex ? styles.activeHeroDot : styles.inactiveHeroDot}
                        ></span>
                      ))}
                    </div>
                    <button className={styles.slideNavBtn} onClick={nextHero}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.mobileOnly}>
                {heroPosts.length > 1 && (
                  <div className={styles.mobileHeroDots}>
                    {heroPosts.map((_, idx) => (
                      <span 
                        key={idx} 
                        className={idx === heroIndex ? styles.activeHeroDot : styles.inactiveHeroDot}
                      ></span>
                    ))}
                  </div>
                )}
                <div 
                  className={styles.heroTrack} 
                  style={{ transform: `translateX(-${heroIndex * 100}%)` }}
                >
                  {heroPosts.map((post, index) => (
                    <div key={post.id} className={styles.heroSlideItem}>
                      <HeroCard {...post} heightRatio="2/3" isPriority={index === 0} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* New Posts Section (Horizontal Scroll/Mixed Grid) */}
            <div className={styles.gridSection}>
              <header className={styles.sectionHeader} style={{ marginTop: isMobile ? '12px' : '0' }}>
                <h2 className={styles.sectionTitle}>새로운 티끌</h2>
                <div className={styles.headerSpacer}></div>
                {filteredPosts.length > 0 && (
                  <button className={`${styles.viewAllLink} ${styles.desktopOnly}`} onClick={() => router.push('/?view=all')}>
                    MORE <span className={styles.linkIcon}>{'>'}</span>
                  </button>
                )}
              </header>

              <div 
                className={`${vType === 'magazine' ? styles.magMainGrid : styles.mainGrid} ${styles.horizontalScrollGrid}`}
                style={{ '--mobile-cols': mobileGridCols } as React.CSSProperties}
              >
                  {displayPosts.map((post, index) => {
                    const excerpt = stripHtml(post.content).slice(0, 160) + (stripHtml(post.content).length > 160 ? '...' : '');
                    return (
                      <PosterCard 
                        key={post.id} 
                        {...post} 
                        aspectRatio={isMobile ? 'default' : 'card45'} 
                        isOneCol={isMobile && mobileGridCols === 1}
                        isMinimal={false} 
                        viewType={vType}
                        excerpt={excerpt}
                        priority={index < (isMobile ? 2 : 4)}
                      />
                    );
                  })}
              </div>

              {/* Feature Section (Dynamically Loaded) */}
              <FeatureSection featurePosts={featurePosts} isMobile={isMobile} />

              {/* Reviews Section (Dynamically Loaded) */}
              <ReviewsSection 
                recentReviews={recentReviews} 
                isMobile={isMobile} 
                scrollReviews={scrollReviews} 
                reviewRef={reviewRef} 
                router={router} 
                MOCK_REVIEWS={MOCK_REVIEWS} 
              />

              {/* Editors Section (Dynamically Loaded) */}
              <EditorsSection editors={editors} isMobile={isMobile} />
            </div>
          </div>
        ) : (
          /* Branch 2: Search/Filter/ViewAll Results View */
          <div className={styles.homeContainer}>
            {/* Author Card (for Author Filter) */}
            {authorData && (
              <div className={styles.authorCardWrapper}>
                <div className={styles.authorCardHeader}>
                  <span>EDITOR</span>
                  <Link href={`/requests/${authorData.id}`} className={styles.headerRequestLink}>
                    티끌러님, 이것도 리뷰해주세요! 💬
                  </Link>
                </div>
                <div className={styles.authorCardContent}>
                  <div className={styles.authorAvatarArea}>
                    <div className={styles.authorAvatarLarge}>
                      <Image 
                        src={(authorData.avatar && (authorData.avatar.startsWith('http') || authorData.avatar.startsWith('/'))) ? authorData.avatar : "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                        alt={authorData.name} 
                        width={120}
                        height={120}
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  </div>
                  <div className={styles.authorDetailsArea}>
                    <div className={styles.authorNameLink}>{authorData.name}</div>
                    <p className={styles.authorBio}>{authorData.description.bio || "생동감 넘치는 리뷰를 작성하는 티끌러입니다."}</p>
                    {authorData.description.bullets && authorData.description.bullets.length > 0 && (
                      <div className={styles.authorBullets}>
                        {authorData.description.bullets.map((b: string, i: number) => (
                          <span key={i} className={styles.authorBullet}># {b}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Results Title & Controls */}
            <div className={styles.resultsHeader}>
              <h1 className={styles.resultsTitle}>
                { isViewMore ? "전체 티끌" : displayTitle}
              </h1>
              {vType === 'card' && (
                <div className={`${styles.headerColControls} ${styles.mobileOnly}`}>
                  <div className={styles.headerColSelector}>
                    {(isMobile ? ['1', '2', '3'] : ['2', '3', '4']).map(n => (
                      <button 
                        key={n}
                        className={`${styles.headerColBtn} ${ (isMobile ? mobileGridCols : cardCols) === parseInt(n) ? styles.headerColActive : ''}`}
                        onClick={() => updateParam(isMobile ? "mCols" : "dCols", n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category Pills & Desktop Controls */}
            <div className={styles.categoryPillRow}>
              <nav className={styles.categoryPillNav}>
                <div className={styles.pillContainer}>
                  {[
                    { id: 'all', name: '전체' },
                    { id: 'restaurant', name: '맛집' },
                    { id: 'travel', name: '여행' },
                    { id: 'movie', name: '영화' },
                    { id: 'game', name: '게임' },
                    { id: 'book', name: '책' },
                    { id: 'exhibition', name: '전시' },
                    { id: 'other', name: '기타' },
                    { id: 'feature', name: '기획전' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        if (cat.id === 'all') params.delete('category');
                        else params.set('category', cat.id);
                        router.push(`/?${params.toString()}`);
                      }}
                      className={`${styles.pillBtn} ${ (categoryFilter === cat.id || (!categoryFilter && cat.id === 'all')) ? styles.pillActive : ''}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </nav>

              {vType === 'card' && (
                <div className={`${styles.headerColControls} ${styles.desktopOnly}`}>
                  <div className={styles.headerColSelector}>
                    {(isMobile ? ['1', '2', '3'] : ['2', '3', '4']).map(n => (
                      <button 
                        key={n}
                        className={`${styles.headerColBtn} ${ (isMobile ? mobileGridCols : cardCols) === parseInt(n) ? styles.headerColActive : ''}`}
                        onClick={() => updateParam(isMobile ? "mCols" : "dCols", n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* The Main Grid Results Area */}
            <div key={isMobile ? 'mobile-grid' : `grid-${vType}-${cardCols}`} className={styles.gridListFade}>
              {vType === 'card' ? (
                <div 
                  className={styles.gridList}
                  style={{ 
                    '--mobile-cols': mobileGridCols,
                    '--desktop-cols': cardCols,
                    '--grid-gap': isMobile ? (mobileGridCols === 3 ? '4.8px' : mobileGridCols === 2 ? '6px' : '24px') : '24px'
                  } as React.CSSProperties}
                >
                  {displayPosts.map((post, index) => (
                    <PosterCard 
                      key={post.id} 
                      {...post} 
                      aspectRatio="default" 
                      isOneCol={(isMobile && mobileGridCols === 1) || (!isMobile && cardCols === 1)}
                      isDense={!isMobile && cardCols === 4}
                      isMinimal={(isMobile && mobileGridCols === 3)}
                      isPublic={post.isPublic}
                      priority={index < (isMobile ? 2 : 4)}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.magazineLayout}>
                  {/* Hero Row: Top 2 Posts */}
                  <div className={styles.magHeroRow}>
                    {displayPosts.slice(0, 2).map((post, index) => (
                      <div key={post.id} className={styles.magHeroItem}>
                        <PosterCard 
                          {...post} 
                          aspectRatio="mag53" 
                          viewType="magazine" 
                          excerpt={stripHtml(post.content)} 
                          priority={index < 2} 
                        />
                      </div>
                    ))}
                  </div>

                  {/* Body: Grouped by Category */}
                  <div className={styles.magBody}>
                    {['restaurant', 'travel', 'movie', 'game', 'book', 'exhibition', 'other'].map(catId => {
                      const label = CATEGORY_LABEL_MAP[catId];
                      // Use displayPosts to respect infinite scroll
                      const heroIds = displayPosts.slice(0, 2).map(p => String(p.id));
                      const catPosts = displayPosts.filter(p => (
                        String(p.category_id) === catId || String(p.categoryId) === catId || String(p.category) === catId || (label && p.category === label)
                      ) && !heroIds.includes(String(p.id)));
                      
                      if (catPosts.length === 0) return null;
                      const catName = label || catPosts[0].category;
                      
                      return (
                        <div key={catId} className={styles.magSection}>
                          <h3 className={styles.magSecTitle}>{catName}</h3>
                          <div className={styles.magList}>
                            {catPosts.map((post: any) => {
                              const excerpt = stripHtml(post.content).slice(0, 100);
                              return (
                                <Link href={`/post/${post.id}`} key={post.id} className={styles.magListItem}>
                                  <div className={styles.magThumbWrap}>
                                    <Image 
                                      src={post.imageUrl} 
                                      alt={post.title} 
                                      className={styles.magThumb} 
                                      fill
                                      sizes="(max-width: 768px) 110px, 130px"
                                      quality={70} 
                                      style={{ objectFit: 'cover' }} 
                                    />
                                  </div>
                                  <div className={styles.magListInfo}>
                                    <h4 className={styles.magListTitle}>{post.title}</h4>
                                    <p className={styles.magListExcerpt}>{excerpt}...</p>
                                    <div className={styles.magMetaRow}>
                                      <span className={styles.magListAuthor}>{post.author?.name || post.authorProfile?.display_name}</span>
                                      <span className={styles.magListDate}>{post.displayDate}</span>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Sentinel for Infinite Scroll */}
            {displayPosts.length < paginatedData.length && (
              <div ref={sentinelRef} className={styles.sentinel}>
                <div className={styles.skeletonGrid}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={isMobile && i > 2 ? styles.mobileHidden : ""}>
                      <SkeletonCard />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
