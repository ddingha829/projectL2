"use client";
 
import { useState, useEffect, useCallback, useRef } from "react";
import IntroAnimation from "@/components/common/IntroAnimation";
import styles from "./page.module.css";
import HeroCard from "@/components/feed/HeroCard";
import PosterCard from "@/components/feed/PosterCard";
import { AUTHORS } from "@/lib/constants/authors";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import ReviewRequest from "@/components/feed/ReviewRequest";

interface HomeContentProps {
  heroPosts: any[];
  otherPosts: any[];
  allPosts: any[];
  displayTitle: string;
  animationKey: string;
  isInitialVisit: boolean;
}

export default function HomeContent({ 
  heroPosts,
  otherPosts,
  allPosts,
  displayTitle, 
  animationKey,
  isInitialVisit 
}: HomeContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const authorFilter = searchParams.get("author");
  const searchFilter = searchParams.get("search");
  
  const isViewMore = searchParams.get("view") === "all";
  const isFiltered = displayTitle !== "Home";
  
  // Find author data from static list OR from the actual posts (for live DB users)
  const staticAuthor = AUTHORS.find(a => a.id === authorFilter);
  const liveAuthor = !staticAuthor && authorFilter 
    ? allPosts.find(p => p.author.id === authorFilter)?.author 
    : null;
    
  const authorData = staticAuthor || liveAuthor;

  const [showIntro, setShowIntro] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<'next' | 'prev'>('next');
  const [currentPage, setCurrentPage] = useState(0);
  const POSTS_PER_PAGE = 8;
  const [visibleCount, setVisibleCount] = useState(6);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileGridCols, setMobileGridCols] = useState(2);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
   const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showMobileFab, setShowMobileFab] = useState(false);
  const [viewType, setViewType] = useState<'magazine' | 'card'>('card');
  const [cardCols, setCardCols] = useState(4); // Default to 4 on PC as requested
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowMobileFab(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // UseEffect to set default cols based on view mode (Main: 2, ViewAll: 3)
  useEffect(() => {
    // If not in View All mode, force 2 columns
    if (!isViewMore && !isFiltered) {
      setMobileGridCols(2);
    } else {
      setMobileGridCols(2); // Default to 2 for all views as requested
    }
  }, [isViewMore, isFiltered]);

  // Detect mobile environment (Client-side)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset counters on filter change (Includes categoryFilter to ensure count resets even if animationKey is same)
  useEffect(() => {
    setCurrentPage(0);
    setVisibleCount(isMobile ? 6 : (cardCols === 4 ? 8 : 6));
  }, [animationKey, categoryFilter, authorFilter, searchFilter, isViewMore, cardCols, isMobile]);

  useEffect(() => {
    if (isInitialVisit && !isMobile) {
      const visited = localStorage.getItem("introVisited");
      if (!visited) {
        setShowIntro(true);
      }
    }
  }, [isInitialVisit, isMobile]);

  // Scroll to top when view or page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: isMobile ? 'instant' as ScrollBehavior : 'smooth' });
  }, [isViewMore, currentPage, isMobile]);

  // Hero auto-slide functionality for all devices (Mobile & PC)
  useEffect(() => {
    if (!heroPosts || heroPosts.length <= 1 || isHeroPaused) return;
    
    const interval = setInterval(() => {
      setSlideDir('next');
      setHeroIndex((prev) => (prev + 1) % heroPosts.length || 0);
    }, 5000); // 5 seconds
    
    return () => clearInterval(interval);
  }, [heroPosts?.length, isHeroPaused]);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    localStorage.setItem("introVisited", "true");
  }, []);

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

  const changeGridCols = (delta: number) => {
    setMobileGridCols(prev => {
      const next = prev + delta;
      if (next >= 1 && next <= 3) return next;
      return prev;
    });
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
    filteredPosts = filteredPosts.filter(p => p.author?.id === authorFilter || p.author_id === authorFilter);
  }
  if (searchFilter) {
    const lowerQuery = searchFilter.toLowerCase();
    filteredPosts = filteredPosts.filter(p => 
      p.title.toLowerCase().includes(lowerQuery) || 
      p.content.toLowerCase().includes(lowerQuery)
    );
  }

  // Grid posts logic
  const showFullGrid = isFiltered || isViewMore;
  const paginatedData = filteredPosts;

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
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
      
      <div className={styles.container}>
        {!showFullGrid ? (
          <>
            <div 
              className={styles.heroWrapper}
              onMouseEnter={() => setIsHeroPaused(true)}
              onMouseLeave={() => setIsHeroPaused(false)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className={styles.desktopOnly}>
                <div 
                  className={styles.heroTrack} 
                  style={{ transform: `translateX(-${heroIndex * 100}%)` }}
                >
                  {heroPosts.map((post) => (
                    <div key={post.id} className={styles.heroSlideItem}>
                      <HeroCard 
                        {...post} 
                        heightRatio="2/3" 
                        showNav={false}
                      />
                    </div>
                  ))}
                </div>
                
                {heroPosts.length > 1 && (
                  <div className={styles.fixedHeroNav}>
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
                <div 
                  className={styles.heroTrack} 
                  style={{ transform: `translateX(-${heroIndex * 100}%)` }}
                >
                  {heroPosts.map((post) => (
                    <div key={post.id} className={styles.mobileHeroItem}>
                      <HeroCard {...post} heightRatio="2/3" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.gridSection}>
              <header className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>최신 글</h2>
                <div className={styles.headerSpacer}></div>
                
                {filteredPosts.length > 0 && (
                  <button className={`${styles.viewAllLink} ${styles.desktopOnly}`} onClick={() => router.push('/?view=all')}>
                    전체 보기 <span className={styles.linkIcon}>→</span>
                  </button>
                )}
              </header>

               {/* Removed mobile grid controls on main screen as requested */}
                
              <div 
                className={styles.mainGrid}
                style={{ '--mobile-cols': mobileGridCols } as React.CSSProperties}
              >
                {displayPosts.map(post => (
                  <PosterCard 
                    key={post.id} 
                    {...post} 
                    aspectRatio={isMobile ? 'default' : 'card45'} 
                    isOneCol={isMobile && mobileGridCols === 1}
                  />
                ))}
              </div>


              
              {/* Sentinel (Unified) */}
              {showFullGrid && displayPosts.length < paginatedData.length && (
                <div ref={sentinelRef} className={styles.sentinel}>
                  <div className={styles.shimmer}>Loading...</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div key={animationKey} className={styles.feedAnimator}>
            {authorData && (
              <div className={styles.authorProfileCard} style={{ '--author-color': authorData.color } as React.CSSProperties}>
                {/* Desktop Profile */}
                <div className={styles.desktopContent}>
                  <div className={styles.profileMain}>
                    <div className={styles.profileTop}>
                      <img src={authorData.avatar} alt={authorData.name} className={styles.profileAvatar} />
                      <h2 className={styles.profileName}>
                        {authorData.name} <span>Editor</span>
                      </h2>
                    </div>
                    <p className={styles.profileBioText}>
                      {authorData.description.bio}
                    </p>
                  </div>
                  <div className={styles.profileDivider}></div>
                  <div className={styles.profileDetail}>
                    <ul className={styles.profileBullets}>
                      {authorData.description.bullets.map((bullet: string, idx: number) => (
                        <li key={idx} className={styles.profileBullet}>
                          <span className={styles.bulletDot} style={{ backgroundColor: authorData.color }}></span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.requestSection}>
                    <ReviewRequest writerId={authorData.id} color={authorData.color} />
                  </div>
                </div>

                {/* Mobile Profile */}
                <div className={styles.mobileContent}>
                  <div className={styles.mobileTopRow}>
                    <div className={styles.mobileAuthorBlock}>
                      <img src={authorData.avatar} alt={authorData.name} className={styles.mobileAvatar} />
                      <div className={styles.mobileNameBadge}>
                        <span className={styles.mobileWriterName}>{authorData.name}</span>
                        <span className={styles.mobileBadge}>EDITOR</span>
                      </div>
                    </div>
                    <div className={styles.mobileMainIntroList}>
                      <ul>
                        {authorData.description.bullets.map((bullet: string, idx: number) => (
                          <li key={idx} style={{ '--author-color': authorData.color } as React.CSSProperties}>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className={styles.mobileBottomRow}>
                    <p className={styles.mobileBioText}>{authorData.description.bio}</p>
                  </div>
                  <div className={styles.mobileRequestBtnWrap}>
                    <ReviewRequest writerId={authorData.id} color={authorData.color} />
                  </div>
                </div>
              </div>
            )}
            <header className={styles.resultsHeader}>
              <h1 className={styles.sectionTitle}>
                { isViewMore ? "전체 포스팅" : displayTitle}
              </h1>
              
              {isMobile && (
                <div className={styles.centeredGridControls}>
                  {/* View Type Icons */}
                  <div className={styles.mobileControlGroup}>
                    <button 
                      className={`${styles.gridBtnIcon} ${viewType === 'card' ? styles.activeGridIcon : ''}`}
                      onClick={() => setViewType('card')}
                      title="카드형 보기"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                    </button>
                    <button 
                      className={`${styles.gridBtnIcon} ${viewType === 'magazine' ? styles.activeGridIcon : ''}`}
                      onClick={() => setViewType('magazine')}
                      title="매거진형 보기"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="9" rx="1"/><rect x="3" y="15" width="8" height="6" rx="1"/><rect x="13" y="15" width="8" height="6" rx="1"/></svg>
                    </button>
                  </div>
                  
                  <div className={styles.mobileControlDivider}></div>

                  {/* Grid Density Icons */}
                  <div className={styles.mobileControlGroup}>
                    <button 
                      className={`${styles.gridBtnIcon} ${mobileGridCols === 1 ? styles.activeGridIcon : ''}`}
                      onClick={() => setMobileGridCols(1)}
                      title="1열로 보기"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="6" width="16" height="4" rx="1"/><rect x="4" y="14" width="16" height="4" rx="1"/></svg>
                    </button>
                    <button 
                      className={`${styles.gridBtnIcon} ${mobileGridCols === 2 ? styles.activeGridIcon : ''}`}
                      onClick={() => setMobileGridCols(2)}
                      title="2열로 보기"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>
                    </button>
                    <button 
                      className={`${styles.gridBtnIcon} ${mobileGridCols === 3 ? styles.activeGridIcon : ''}`}
                      onClick={() => setMobileGridCols(3)}
                      title="3열로 보기"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="4.5" height="16" rx="0.5"/><rect x="9.75" y="4" width="4.5" height="16" rx="0.5"/><rect x="15.5" y="4" width="4.5" height="16" rx="0.5"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </header>

            {/* Unified Control Bar for Results View */}
            <div className={styles.resultsControlsBar}>
              {/* Left Group (Hidden on mobile if icons used above) */}
              <div className={`${styles.controlsLeft} ${styles.desktopOnly}`}>
                <div className={styles.pillContainer}>
                  <button 
                    className={`${styles.pillBtn} ${viewType === 'card' ? styles.pillActive : ''}`}
                    onClick={() => setViewType('card')}
                  >
                    카드형
                  </button>
                  <button 
                    className={`${styles.pillBtn} ${viewType === 'magazine' ? styles.pillActive : ''}`}
                    onClick={() => setViewType('magazine')}
                  >
                    매거진형
                  </button>
                </div>
              </div>

              {/* Center Group: Category Filter Pills */}
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
                    { id: 'other', name: '기타' }
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

              {/* Right Group: Grid Density */}
              <div className={styles.controlsRight}>
                {viewType === 'card' && (
                  <div className={styles.pillContainer}>
                    {isMobile ? null : [3, 4].map(num => (
                      <button 
                        key={num}
                        className={`${styles.pillBtn} ${cardCols === num ? styles.pillActive : ''}`}
                        onClick={() => setCardCols(num)}
                      >
                        {num}열
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>


            <div key={isMobile ? 'mobile-grid' : `grid-${viewType}-${cardCols}`} className={styles.gridListFade}>
              {viewType === 'card' ? (
                <div 
                  className={styles.gridList}
                  style={{ 
                    '--mobile-cols': mobileGridCols,
                    '--desktop-cols': cardCols 
                  } as React.CSSProperties}
                >
                  {displayPosts.map(post => (
                    <PosterCard 
                      key={post.id} 
                      {...post} 
                      aspectRatio="default" 
                      isOneCol={(isMobile && mobileGridCols === 1) || (!isMobile && cardCols === 1)}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.magazineLayout}>
                  {/* Hero Row: Top 2 posts large */}
                  <div className={styles.magHeroRow}>
                    {displayPosts.slice(0, 2).map(post => (
                      <div key={post.id} className={styles.magHeroItem}>
                        <PosterCard {...post} aspectRatio="mag54" />
                      </div>
                    ))}
                  </div>

                  {/* Body: Group by categories */}
                  <div className={styles.magBody}>
                    {['restaurant', 'travel', 'movie', 'game', 'book', 'exhibition', 'other'].map(catId => {
                      const label = CATEGORY_LABEL_MAP[catId];
                      // Filter by category and exclude head posts for uniqueness
                      const heroIds = paginatedData.slice(0, 2).map(p => p.id);
                      const catPosts = paginatedData.filter(p => (
                        p.category_id === catId || 
                        p.categoryId === catId ||
                        p.category === catId || 
                        (label && p.category === label)
                      ) && !heroIds.includes(p.id)).slice(0, 5);
                      
                      if (catPosts.length === 0) return null;
                      const catName = label || catPosts[0].category;

                      return (
                        <div key={catId} className={styles.magSection}>
                          <h3 className={styles.magSecTitle}>{catName}</h3>
                          <div className={styles.magList}>
                            {catPosts.map(post => (
                              <Link href={`/post/${post.id}`} key={post.id} className={styles.magListItem}>
                                <div className={styles.magThumbWrap}>
                                  <img src={post.imageUrl} alt={post.title} className={styles.magThumb} />
                                </div>
                                <div className={styles.magListInfo}>
                                  <h4 className={styles.magListTitle}>{post.title}</h4>
                                  <p className={styles.magListAuthor}>{post.author.name} · {post.displayDate}</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Unified Sentinel */}
              {displayPosts.length < paginatedData.length && (
                <div ref={sentinelRef} className={styles.sentinel}>
                  <div className={styles.shimmer}>Loading...</div>
                </div>
              )}
            </div>
          </div>
        )}
        <MobileScrollFab isMobile={isMobile} isViewMore={isViewMore} showMobileFab={showMobileFab} />
      </div>
    </>
  );
}

// Separate component for the Floating FAB to avoid unnecessary re-renders of the whole page
function MobileScrollFab({ isMobile, isViewMore, showMobileFab }: { isMobile: boolean, isViewMore: boolean, showMobileFab: boolean }) {
  const router = useRouter();
  if (!isMobile || isViewMore) return null;
  
  return (
    <div className={`${styles.mobileViewAllContainer} ${showMobileFab ? styles.visibleFab : ""}`}>
      <button 
        className={styles.mobileViewAllBtn}
        onClick={() => router.push('/?view=all')}
      >
        전체 포스팅 더보기
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  );
}
