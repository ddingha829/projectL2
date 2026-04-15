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
  isInitialVisit,
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
  const authorFilter = rawAuthor ? decodeURIComponent(rawAuthor) : null;
  const searchFilter = searchParams.get("search");
  
  const isViewMore = searchParams.get("view") === "all";
  const isFiltered = displayTitle !== "Home";
  const reviewRef = useRef<HTMLDivElement>(null);
  const scrollReviews = (direction: 'left' | 'right') => {
    if (!reviewRef.current) return;
    const scrollAmount = 350;
    reviewRef.current.scrollBy({ 
      left: direction === 'left' ? -scrollAmount : scrollAmount, 
      behavior: 'smooth' 
    });
  };
  
  // 1. Find from static AUTHORS constant
  const staticAuthor = AUTHORS.find(a => String(a.id) === authorFilter || a.name === authorFilter);
  
  // 2. Find from the passed 'editors' prop (DB Profiles)
  const dbAuthorProfile = (editors || []).find(ed => (ed && String(ed.id) === authorFilter) || (ed && ed.display_name === authorFilter));
  
  // 3. Fallback: find from the posts themselves (ID or Name match)
  const foundInPosts = !staticAuthor && !dbAuthorProfile && authorFilter 
    ? allPosts.find(p => (p.author && (String(p.author_id) === authorFilter || String(p.author.id) === authorFilter || p.author.name === authorFilter))) 
    : null;
    
  // Unified mapping with default safety
  const liveAuthor = dbAuthorProfile ? {
    id: dbAuthorProfile.id,
    name: dbAuthorProfile.display_name || dbAuthorProfile.name || authorFilter || "에디터",
    avatar: dbAuthorProfile.avatar_url || dbAuthorProfile.avatar || "/default-avatar.png",
    bio: dbAuthorProfile.bio || "티끌 매거진 에디터입니다.",
    role: dbAuthorProfile.role === 'admin' ? '운영자' : '티끌러'
  } : foundInPosts ? {
    id: foundInPosts.author?.id || authorFilter,
    name: foundInPosts.author?.name || foundInPosts.authorProfile?.display_name || authorFilter || "에디터",
    avatar: foundInPosts.author?.avatar || foundInPosts.authorProfile?.avatar_url || "/default-avatar.png",
    bio: foundInPosts.author?.bio || foundInPosts.authorProfile?.bio || "티끌 매거진 에디터입니다.",
    role: "Editor"
  } : authorFilter ? {
    id: authorFilter,
    name: authorFilter, // Fallback to using the filter string as name if it's a slug
    avatar: "/default-avatar.png",
    bio: "티끌 매거진 에디터입니다.",
    role: "Editor"
  } : null;
    
  const authorData = staticAuthor || liveAuthor;

  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);

  const [heroIndex, setHeroIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<'next' | 'prev'>('next');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Determine Device Type
    const isMob = isMobileServer || window.innerWidth <= 768;
    setIsMobile(isMob);
    
    // 2. Defaulting Logic with preservation
    const currentView = searchParams.get('viewType');
    
    if (!currentView && !hasInitialized) {
      const params = new URLSearchParams(window.location.search);
      
      // Preserve existing important flags
      const isActuallyViewMore = params.get('view') === 'all';
      
      if (initialViewType) {
        params.set('viewType', initialViewType);
      } else {
        if (isMob) {
          params.set('viewType', 'card');
          if (!params.get('mCols')) params.set('mCols', '2');
        } else {
          params.set('viewType', 'magazine');
          if (!params.get('dCols')) params.set('dCols', '4');
        }
      }

      // Re-apply view=all just in case
      if (isActuallyViewMore) params.set('view', 'all');

      router.replace(`?${params.toString()}`, { scroll: false });
      setHasInitialized(true);
    }
  }, [searchParams, hasInitialized, router, isMobileServer, initialViewType]);

  // View Sync Helper (Cookies & DB)
  const setCookie = (name: string, value: string) => {
    document.cookie = `${name}=${value}; path=/; max-age=31536000`; // 1 year
  };

  // Save selection (Cookies & DB)
  useEffect(() => {
    const currentView = searchParams.get('viewType');
    if (!currentView) return;

    // Sync to Cookie immediately for flicker prevention next time
    if (isMobile) {
      setCookie('viewType_mobile', currentView);
    } else {
      setCookie('viewType_pc', currentView);
    }

    if (!userProfile) return;
    
    // Debounced Save to DB
    const saveToDb = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updateData: any = {
        preferred_view_type: currentView // Compatibility fallback
      };

      if (isMobile) {
        updateData.preferred_view_mobile = currentView;
        updateData.preferred_m_cols = parseInt(searchParams.get('mCols') || '2');
      } else {
        updateData.preferred_view_pc = currentView;
        updateData.preferred_d_cols = parseInt(searchParams.get('dCols') || '4');
      }

      await supabase.from('profiles').update(updateData).eq('id', user.id);
    };

    const timer = setTimeout(saveToDb, 2000); // 2s debounce
    return () => clearTimeout(timer);
  }, [searchParams, userProfile, isMobile]);

  const vType = (searchParams.get("viewType") || initialViewType || (isMobile ? "card" : "magazine")) as "card" | "magazine";
  const mobileGridCols = vType === 'magazine' ? 1 : parseInt(searchParams.get("mCols") || "2");
  const cardCols = parseInt(searchParams.get("dCols") || "4"); // PC default grid 4 as requested

  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showMobileFab, setShowMobileFab] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowMobileFab(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // UseEffect to sync grid cols based on URL params (removed setters from local use)
  useEffect(() => {
    // We can no longer 'set' here, but we can redirect if needed. 
    // For now, these effects are mostly for page resets.
  }, [isViewMore, isFiltered]);

  const prevWidth = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width <= 768;
      
      // 768px 임계값을 넘나들 때만 상태 변경
      if (mobile !== (prevWidth.current <= 768)) {
        setIsMobile(mobile);
        if (mobile) updateParam("viewType", "card");
      }
      prevWidth.current = width;
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset counters on filter change (Includes categoryFilter to ensure count resets even if animationKey is same)
  useEffect(() => {
    setCurrentPage(0);
    setVisibleCount(isMobile ? 6 : (cardCols === 4 ? 8 : 6));
  }, [animationKey, categoryFilter, authorFilter, searchFilter, isViewMore, cardCols, isMobile]);



  // Scroll to top when view or page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: isMobile ? 'instant' as ScrollBehavior : 'smooth' });
  }, [isViewMore, currentPage, isMobile]);

  // Hero auto-slide functionality for all devices (Mobile & PC)
  useEffect(() => {
    if (!heroPosts || heroPosts.length <= 1 || isHeroPaused) return;
    
    const interval = setInterval(() => {
      setSlideDir('next');
      setHeroIndex((prev) => (prev + 1) % heroPosts.length);
    }, isMobile ? 4000 : 5000); 
    
    return () => clearInterval(interval);
  }, [heroPosts?.length, isHeroPaused, isMobile, heroIndex]);





  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !heroPosts) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setSlideDir('next');
      setHeroIndex((prev) => (prev + 1) % heroPosts.length);
    } else if (isRightSwipe) {
      setSlideDir('prev');
      setHeroIndex((prev) => (prev - 1 + heroPosts.length) % heroPosts.length);
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };



  const nextHero = (e: React.MouseEvent) => {
    e.preventDefault();
    setSlideDir('next');
    setHeroIndex((prev) => (prev + 1) % heroPosts.length);
  };

  const prevHero = (e: React.MouseEvent) => {
    e.preventDefault();
    setSlideDir('prev');
    setHeroIndex((prev) => (prev - 1 + heroPosts.length) % heroPosts.length);
  };

  const updateParam = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, val);
    router.replace(`?${params.toString()}`, { scroll: false });
  };


  const CATEGORY_LABEL_MAP: Record<string, string> = {
    'all': '전체',
    'restaurant': '맛집',
    'travel': '여행',
    'movie': '영화',
    'game': '게임',
    'book': '책',
    'exhibition': '전시회',
    'other': '기타'
  };

  // Unified Filtering for the grid
  let filteredPosts = allPosts;
  if (categoryFilter && categoryFilter !== 'all') {
    const label = CATEGORY_LABEL_MAP[categoryFilter];
    filteredPosts = filteredPosts.filter(p => 
      p.categoryId === categoryFilter || 
      p.category_id === categoryFilter || 
      p.category === categoryFilter ||
      (label && p.category === label)
    );
  }
  if (authorFilter && authorFilter !== 'all') {
    filteredPosts = filteredPosts.filter(p => 
      String(p.author?.id) === authorFilter || 
      String(p.author_id) === authorFilter ||
      p.author?.name === authorFilter
    );
  }
  if (searchFilter) {
    const lowerQuery = searchFilter.toLowerCase();
    filteredPosts = filteredPosts.filter(p => 
      p.title.toLowerCase().includes(lowerQuery) || 
      p.content.toLowerCase().includes(lowerQuery)
    );
  }

  // Grid posts logic
  // Unified state for determining if we should show the full grid vs home page sections
  const showFullGrid = useMemo(() => {
    const fromParams = isFiltered || isViewMore;
    if (typeof window === 'undefined') return fromParams;
    
    // Supplement with direct check if client-side to prevent hydration flicker
    const rawSearch = window.location.search;
    return fromParams || rawSearch.includes('view=all') || rawSearch.includes('category=') || rawSearch.includes('author=') || rawSearch.includes('search=');
  }, [isFiltered, isViewMore]);
  const paginatedData = useMemo(() => filteredPosts, [filteredPosts]);

  // Selection logic: Infinite Scroll for results, but 2 for the main page
  const displayPosts = showFullGrid 
    ? paginatedData.slice(0, visibleCount) 
    : otherPosts.slice(0, 4);

  // Infinite Scroll Trigger (Unified for all devices)
  useEffect(() => {
    if (!showFullGrid) return;
    
    const pageSize = isMobile ? 6 : (cardCols === 4 ? 8 : 6);
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => Math.min(prev + pageSize, paginatedData.length));
      }
    }, { 
      threshold: 0.1,
      rootMargin: '300px'
    });

    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [paginatedData.length, showFullGrid, visibleCount]);

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
                  {heroPosts.map((post) => (
                    <div key={post.id} className={styles.heroSlideItem}>
                      <HeroCard {...post} heightRatio="2/3" showNav={false} />
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
                  {heroPosts.map((post) => (
                    <div key={post.id} className={styles.heroSlideItem}>
                      <HeroCard {...post} heightRatio="2/3" />
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

              {/* Feature Section */}
              <div className={styles.featureSection}>
                <header className={styles.sectionHeader} style={{ marginTop: isMobile ? '12px' : '25px' }}>
                  <h2 className={styles.sectionTitle}>태산 : 티끌 모아 봄</h2>
                  <div className={styles.headerSpacer}></div>
                  <Link href="/?category=feature" className={styles.viewAllLink}>
                    MORE <span className={styles.linkIcon}>{'>'}</span>
                  </Link>
                </header>
                <div className={styles.featureGrid}>
                  {(featurePosts.length > 0 ? featurePosts : [
                    { id: 'f1', title: '티끌러 선정 2026.4 최고의 점심메뉴', imageUrl: 'https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?auto=format&fit=crop&w=1600&q=80' }
                  ]).map((feature: any) => (
                    <Link key={feature.id} href={feature.id.startsWith('db-') ? `/post/${feature.id}` : '#'} className={styles.featureBanner}>
                      <Image 
                        src={feature.imageUrl} 
                        alt={feature.title} 
                        className={styles.featureImage} 
                        fill
                        sizes="(max-width: 768px) 100vw, 1200px"
                        quality={80}
                        style={{ objectFit: 'cover' }}
                      />
                      <div className={styles.featureOverlay}>
                        <h3 className={styles.featureTitle}>{feature.title}</h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Reviews Section */}
              <div className={styles.recentReviewsSection}>
                <header className={styles.sectionHeader} style={{ marginTop: isMobile ? '12px' : '15px' }}>
                  <h2 className={styles.sectionTitle}>한줄 평</h2>
                  <div className={styles.headerSpacer}></div>
                </header>
                <div className={styles.recentReviewsWrapper}>
                  <button className={`${styles.scrollBtn} ${styles.scrollBtnLeft}`} onClick={() => scrollReviews('left')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <div className={styles.reviewHorizontalGrid} ref={reviewRef}>
                    {(recentReviews && recentReviews.length > 0 ? recentReviews : MOCK_REVIEWS).slice(0, 7).map((rev) => (
                      <div key={rev.id} className={styles.miniReviewCard} onClick={() => router.push(`/reviews?search=${encodeURIComponent(rev.subject)}`)}>
                        <h4 className={styles.miniRevSubject}>{rev.subject}</h4>
                        <div className={styles.miniRevRating}>
                          <div className={styles.miniRevInnerRow}>
                            <div className={styles.miniRevStars}>
                              {[1, 2, 3, 4, 5].map(i => (
                                <span key={i} style={{ color: (rev.rating >= i * 2) ? '#ff4804' : '#ddd' }}>★</span>
                              ))}
                            </div>
                            <span className={styles.miniRevScore}>{rev.rating}</span>
                            <span className={styles.miniRevCommunityScore}>유저 {(rev.rating * 0.7 + 1.5).toFixed(1)}</span>
                          </div>
                        </div>
                        <p className={styles.miniRevText}>{rev.comment}</p>
                        <div className={styles.miniRevFooter}>
                          <span className={styles.miniRevAuthor}>{rev.authorName}</span>
                          {(rev.id && !String(rev.id).startsWith('m')) && (
                            <Link href={`/post/db-${rev.id}`} className={styles.miniRevLink} onClick={(e) => e.stopPropagation()}>리뷰 보기 →</Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className={`${styles.scrollBtn} ${styles.scrollBtnRight}`} onClick={() => scrollReviews('right')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              </div>

              {/* Editors Section */}
              <div className={styles.editorsSection}>
                <header className={styles.sectionHeader} style={{ marginTop: isMobile ? '12px' : '25px' }}>
                  <h2 className={styles.sectionTitle}>티끌러</h2>
                  <div className={styles.headerSpacer}></div>
                </header>
                <div className={styles.editorsGrid}>
                  {editors.map((ed: any) => (
                    <Link key={ed.id} href={`/?author=${ed.id}`} className={styles.editorProfileCard}>
                      <div className={styles.edAvatarWrapper}>
                        <Image 
                          src={(ed.avatar_url && (ed.avatar_url.startsWith('http') || ed.avatar_url.startsWith('/'))) ? ed.avatar_url : "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                          alt={ed.display_name} 
                          className={styles.edAvatarImg} 
                          width={100}
                          height={100}
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                      <div className={styles.edInfo}>
                        <h3 className={styles.edName}>{ed.display_name}</h3>
                        <span className={styles.edRole}>{ed.role === 'admin' ? '운영자' : '티끌러'}</span>
                        <p className={styles.edBio}>
                          {ed.bio || "생동감 넘치는 리뷰를 작성하는 티끌러입니다."}
                        </p>
                      </div>
                      {ed.bullets && ed.bullets.length > 0 && (
                        <div className={styles.edBullets}>
                          {ed.bullets.slice(0, 3).map((b: string, i: number) => (
                            <span key={i} className={styles.edBulletPill}>{b}</span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
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
