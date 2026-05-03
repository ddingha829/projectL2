"use client";
 
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import styles from "./page.module.css";
import Image from "next/image";
import PosterCard from "@/components/feed/PosterCard";
import { AUTHORS } from "@/lib/constants/authors";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import layoutStyles from "./layout.module.css";
import SectionLayout from "@/components/shared/SectionLayout";
import { CATEGORY_MAP, CATEGORY_LIST } from "@/lib/constants/categories";
const ReviewRequest = dynamic(() => import("@/components/feed/ReviewRequest"), { ssr: false });
import SkeletonCard from "@/components/feed/SkeletonCard";
import DynamicIssueCover from "@/components/home/DynamicIssueCover";

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
  
  // [개선] '티끌플레이스' 커스텀 카드가 미리보기에 포함되지 않도록 더욱 강력하게 제거
  // 1. 블록 임베드 전체 구조 제거 (중첩 div 고려)
  let cleanHtml = html.replace(/<div[^>]+class="[^"]*ql-review-card[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, '');
  
  // 2. 남아있을 수 있는 텍스트 아티팩트 직접 제거
  cleanHtml = cleanHtml
    .replace(/TICGLE PLACE/g, '')
    .replace(/구글 지도에서 크게 보기/g, '')
    .replace(/별점 [0-9.]+/g, '');
  
  return cleanHtml
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
  isInitialVisit?: boolean;
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
  magazineIssue?: {
    number: string;
    publishedAt: string;
  } | null;
}

function LazySection({ children, threshold = 0.1 }: { children: React.ReactNode, threshold?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} style={{ minHeight: isVisible ? 'auto' : '100px' }}>
      {isVisible ? children : null}
    </div>
  );
}

export default function HomeContent({ 
  heroPosts,
  otherPosts,
  allPosts,
  displayTitle, 
  animationKey,
  recentReviews = [],
  featurePosts = [],
  userProfile,
  isMobileServer = false,
  initialViewType,
  editors = [],
  magazineIssue
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
    ...CATEGORY_MAP
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
    const scrollAmount = reviewRef.current.clientWidth * 0.8;
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
    if (searchParams.get('scrollTo') === 'bottom') {
      // 컨텐츠 로딩 시간을 고려하여 약간의 지연 후 하단으로 스크롤
      const timer = setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 600);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, behavior: isMobile ? 'instant' : 'smooth' });
    }
  }, [isViewMore, currentPage, isMobile, searchParams]);

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
  const displayPosts = useMemo(() => showFullGrid ? paginatedData.slice(0, visibleCount) : otherPosts, [showFullGrid, paginatedData, visibleCount, otherPosts]);

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
  // [임시] 매거진 모드 고정 및 전환 기능 비활성화
  // const vType = (queryVType || initialViewType || (isMobile ? "card" : "magazine")) as "card" | "magazine";
  const vType = "magazine"; 

  const mobileGridCols = vType === 'magazine' ? 1 : parseInt(searchParams.get("mCols") || "2");
  const cardCols = parseInt(searchParams.get("dCols") || "4");

  return (
    <>
      {/* [잠시 비활성화] 매거진 인트로
      isInitialVisit && heroPosts.length > 0 && (
        <DynamicIssueCover 
          posts={heroPosts} 
          issueNumber={magazineIssue?.number || "2026-1"} 
        />
      )
      */}
      <div className={styles.container}>
        {/* Branch 1: Home Page View (Mixed Sections) */}
        {!showFullGrid ? (
          <div className={styles.homeContainer}>
            <div className={layoutStyles.centeredContent}>
              {/* New Main Top Section (Replaces Hero and New Posts) */}
              <div className={styles.gridSection}>

                <SectionLayout
                  title=""
                  isFirst
                  noGrid
                  className={styles.magazineSection}
                  customTitle={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <h2 className={styles.magSecTitleNew} style={{ margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'nowrap' }}>
                        <Link href="/magazine" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                          {magazineIssue ? (
                            <>
                              <span className={styles.issueBadge}>
                                {(() => {
                                  const parts = magazineIssue.number.split('-');
                                  return parts.length === 2 ? `${parts[0]} ISSUE ${parts[1]}` : magazineIssue.number;
                                })()}
                              </span>
                              <span style={{ color: '#ff4804' }}>티끌 매거진</span>
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.57em', fontWeight: 400, marginLeft: '8px' }}>
                                ({(() => { 
                                  const d = new Date(magazineIssue.publishedAt); 
                                  const mm = String(d.getMonth() + 1).padStart(2, '0'); 
                                  const dd = String(d.getDate()).padStart(2, '0'); 
                                  return `${mm}.${dd}`; 
                                })()})
                              </span>
                            </>
                          ) : (
                            <>
                              <span className={styles.issueBadge}>2026 ISSUE 1</span>
                              <span style={{ color: '#ff4804' }}>티끌 매거진</span>
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.57em', fontWeight: 400, marginLeft: '8px' }}>(준비 중)</span>
                            </>
                          )}
                        </Link>
                      </h2>
                      <Link href="/magazine" className={styles.viewMoreBtnInline} style={{ color: '#888', fontWeight: 900, fontSize: '1.2rem', paddingLeft: '10px' }}>
                        ❯
                      </Link>
                    </div>
                  }
                >

                <div className={styles.newMainLayout}>
                  {heroPosts.length > 0 && (
                    <Link href={`/post/${heroPosts[0].id}`} className={styles.newMainLargeCard}>
                      <div className={styles.newMainLargeThumbWrap}>
                        <Image 
                          src={heroPosts[0].imageUrl} 
                          alt={heroPosts[0].title} 
                          fill
                          className={styles.newMainLargeImg}
                          sizes="(max-width: 768px) 100vw, 60vw"
                          priority
                        />
                      </div>
                      <div className={styles.newMainLargeInfo}>
                        <h3 className={styles.newMainLargeTitle}>{heroPosts[0].title}</h3>
                        <p className={styles.newMainLargeExcerpt}>{stripHtml(heroPosts[0].content).slice(0, 160)}...</p>
                        <div className={styles.magMetaRow}>
                          <span className={styles.magCardCategory}>{CATEGORY_LABEL_MAP[heroPosts[0].category || heroPosts[0].category_id || heroPosts[0].categoryId] || heroPosts[0].category}</span>
                          <div className={styles.magMetaRight}>
                            <span className={styles.magListAuthor}>{heroPosts[0].author?.name || heroPosts[0].authorProfile?.display_name}</span>
                            <span className={styles.magListViews}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px' }}>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                              {heroPosts[0].views?.toLocaleString()}
                            </span>
                            <span className={styles.magListDate}>{heroPosts[0].displayDate}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )}
                  
                  {/* PC/Mobile: posts 1~3 as B cards */}
                  <div className={styles.newMainSmallList}>
                    {heroPosts.slice(1, 4).map(post => (
                      <Link href={`/post/${post.id}`} key={post.id} className={styles.magListItem}>
                        <div className={styles.magThumbWrap}>
                          <Image 
                            src={post.imageUrl} 
                            alt={post.title} 
                            fill
                            className={styles.magThumb}
                            sizes="(max-width: 768px) 180px, 200px"
                          />
                        </div>
                        <div className={styles.magListInfo}>
                          <h4 className={styles.magListTitle}>{post.title}</h4>
                          <p className={styles.magListExcerpt}>{stripHtml(post.content).slice(0, 100)}...</p>
                          <div className={styles.magMetaRow}>
                            <span className={styles.magCardCategory}>{CATEGORY_LABEL_MAP[post.category || post.category_id || post.categoryId] || post.category}</span>
                            <div className={styles.magMetaRight}>
                              <span className={styles.magListAuthor}>{post.author?.name || post.authorProfile?.display_name}</span>
                              <span className={styles.magListViews}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px' }}>
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                {post.views?.toLocaleString()}
                              </span>
                              <span className={styles.magListDate}>{post.displayDate}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
                </SectionLayout>

                {/* 2. New Posts Section: Title + C-cards (Posts 4~8) */}
                <SectionLayout 
                  title="새로운 " 
                  titleHighlight="티끌" 
                  moreHref="/?view=all"
                  showMore={false}
                  noGrid
                >
                  <div className={`${styles.editorsGrid} ${isMobile ? styles.horizontalScrollMobile : ''}`} style={{ marginBottom: '40px' }}>
                    {otherPosts.slice(0, 5).map((post: any) => (
                      <Link href={`/post/${post.id}`} key={post.id} className={styles.postCardC}>
                        <div className={styles.cPhotoWrap}>
                          <Image 
                            src={post.imageUrl} 
                            alt={post.title} 
                            className={styles.cPhoto}
                            width={220}
                            height={220}
                          />
                        </div>
                        <div className={styles.cCardBody}>
                          <h3 className={styles.cTitle}>{post.title}</h3>
                          <p className={styles.cExcerpt}>{stripHtml(post.content).slice(0, 80)}...</p>
                        </div>
                        <div className={styles.cCardFooter}>
                          <span className={styles.magCardCategory}>
                            {CATEGORY_LABEL_MAP[post.category || post.category_id || post.categoryId] || post.category}
                          </span>
                          <div className={styles.magMetaRight}>
                            <span className={styles.magListAuthor}>
                              {post.author?.name || post.authorProfile?.display_name || "익명"}
                            </span>
                            <span className={styles.magListViews}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px' }}>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                              {post.views?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </SectionLayout>

                {/* [모바일] 하단 섹션 순차로딩 (IntersectionObserver 이용) */}
                {isMobile ? (
                  <>
                    <LazySection threshold={0.05}>
                      <ReviewsSection 
                        recentReviews={recentReviews} 
                        isMobile={isMobile} 
                        scrollReviews={scrollReviews} 
                        reviewRef={reviewRef} 
                        router={router} 
                        MOCK_REVIEWS={MOCK_REVIEWS} 
                        moreHref="/reviews"
                      />
                    </LazySection>

                    <LazySection threshold={0.05}>
                      <EditorsSection editors={editors} isMobile={isMobile} allPosts={allPosts} moreHref="/?view=editors" />
                    </LazySection>
                  </>
                ) : (
                  <>
                    <ReviewsSection 
                      recentReviews={recentReviews} 
                      isMobile={isMobile} 
                      scrollReviews={scrollReviews} 
                      reviewRef={reviewRef} 
                      router={router} 
                      MOCK_REVIEWS={MOCK_REVIEWS} 
                      moreHref="/reviews"
                    />
                    <EditorsSection editors={editors} isMobile={isMobile} allPosts={allPosts} moreHref="/?view=editors" />
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Branch 2: Search/Filter/ViewAll Results View */
          <div className={styles.homeContainer}>
            <div className={layoutStyles.centeredContent}>
              {/* Author Card (for Author Filter) */}
              {authorData && (
                <div className={styles.authorCardWrapper}>
                  <div className={styles.authorCardHeaderStandard}>
                    <span className={styles.standardCardLabel}>TICGLER PROFILE</span>
                    <Link href={`/requests/${authorData.display_name || authorData.name || authorData.id}`} className={styles.headerRequestLinkStandard}>
                      티끌러님, 이것도 리뷰해주세요! 💬
                    </Link>
                  </div>
                  <div className={styles.authorCardMainStandard}>
                    <div className={styles.authorCardMediaStandard}>
                      <Image 
                        src={(authorData.avatar && (authorData.avatar.startsWith('http') || authorData.avatar.startsWith('/'))) ? authorData.avatar : "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                        alt={authorData.name} 
                        width={220}
                        height={220}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    </div>
                    <div className={styles.authorCardInfoStandard}>
                      <div className={styles.authorNameStandard}>{authorData.name}</div>
                      <p className={styles.authorBioStandard}>{authorData.description.bio || "생동감 넘치는 리뷰를 작성하는 티끌러입니다."}</p>
                      {authorData.description.bullets && authorData.description.bullets.length > 0 && (
                        <div className={styles.authorBulletsStandard}>
                          {authorData.description.bullets.map((b: string, i: number) => (
                            <span key={i} className={styles.authorBulletStandard}># {b}</span>
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
                  { isViewMore ? (
                    <><span style={{ color: '#ff4804' }}>티끌</span> 모음</>
                  ) : displayTitle}
                </h1>
                {(vType as any) === 'card' && (
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
                      ...CATEGORY_LIST
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

                {(vType as any) === 'card' && (
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
                {(vType as any) === 'card' ? (
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
                    {/* Body: Grouped by Category */}
                    <div className={styles.magBody}>
                    {(() => {
                      const activeCat = categoryFilter;
                      const hasActiveCat = activeCat && activeCat !== 'all';

                      if (!hasActiveCat) {
                        // All Categories state (latest posts)
                        return (
                          <div className={styles.magSectionFull}>
                            <div className={styles.magSecHeader}>
                              <h3 className={styles.magSecTitleNew}>최신순</h3>
                            </div>
                            <div className={styles.magListGrid}>
                              {paginatedData.map((post: any) => {
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
                                        <span className={styles.magCardCategory}>{CATEGORY_LABEL_MAP[post.category || post.category_id || post.categoryId] || post.category}</span>
                                        <div className={styles.magMetaRight}>
                                          <span className={styles.magListAuthor}>{post.author?.name || post.authorProfile?.display_name}</span>
                                          <span className={styles.magListViews}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px' }}>
                                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                              <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                            {post.views?.toLocaleString()}
                                          </span>
                                          <span className={styles.magListDate}>{post.displayDate}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Specific Category state
                      const label = CATEGORY_LABEL_MAP[activeCat];
                      const catName = label || paginatedData[0]?.category || "게시물";

                      return (
                        <div className={styles.magSectionFull}>
                          <div className={styles.magSecHeader}>
                            <h3 className={styles.magSecTitleNew}>{catName}</h3>
                          </div>
                          <div className={styles.magListGrid}>
                            {paginatedData.map((post: any) => {
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
                                      <span className={styles.magCardCategory}>{CATEGORY_LABEL_MAP[post.category || post.category_id || post.categoryId] || post.category}</span>
                                      <div className={styles.magMetaRight}>
                                        <span className={styles.magListAuthor}>{post.author?.name || post.authorProfile?.display_name}</span>
                                        <span className={styles.magListViews}>
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px' }}>
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                          </svg>
                                          {post.views?.toLocaleString()}
                                        </span>
                                        <span className={styles.magListDate}>{post.displayDate}</span>
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
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
          </div>
        )}
      </div>
    </>
  );
}
