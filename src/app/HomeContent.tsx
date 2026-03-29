"use client";
 
import { useState, useEffect } from "react";
import IntroAnimation from "@/components/common/IntroAnimation";
import styles from "./page.module.css";
import HeroCard from "@/components/feed/HeroCard";
import PosterCard from "@/components/feed/PosterCard";
import { AUTHORS } from "@/lib/constants/authors";
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
  const [mobileVisibleCount, setMobileVisibleCount] = useState(4);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile environment (Client-side)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset counters on filter change
  useEffect(() => {
    setCurrentPage(0);
    setMobileVisibleCount(4);
  }, [animationKey]);

  useEffect(() => {
    if (isInitialVisit && !isMobile) {
      const visited = sessionStorage.getItem("introVisited");
      if (!visited) {
        Promise.resolve().then(() => setShowIntro(true));
      }
    }
  }, [isInitialVisit, isMobile]);

  // Scroll to top when view or page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isViewMore, currentPage]);

  const handleIntroComplete = () => {
    setShowIntro(false);
    sessionStorage.setItem("introVisited", "true");
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

  // If we have filters, just show the grid with the title
  const isFiltered = displayTitle !== "Home";

  // Unified Filtering for the grid
  let filteredPosts = allPosts;
  if (categoryFilter && categoryFilter !== 'all') {
    filteredPosts = filteredPosts.filter(p => p.categoryId === categoryFilter);
  }
  if (authorFilter && authorFilter !== 'all') {
    filteredPosts = filteredPosts.filter(p => p.author.id === authorFilter);
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
  const totalPages = Math.ceil(paginatedData.length / POSTS_PER_PAGE);

  // Selection logic: Desktop (Pagination) vs Mobile (Infinite)
  const displayPosts = showFullGrid 
    ? (isMobile 
        ? paginatedData.slice(0, mobileVisibleCount) 
        : paginatedData.slice(currentPage * POSTS_PER_PAGE, (currentPage + 1) * POSTS_PER_PAGE))
    : (isMobile
        ? otherPosts.slice(0, 4)
        : otherPosts.slice(0, 4));

  // Infinite Scroll Trigger
  useEffect(() => {
    if (!isMobile || !showFullGrid) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setMobileVisibleCount(prev => Math.min(prev + 4, paginatedData.length));
      }
    }, { 
      threshold: 0.05,
      rootMargin: '100px' // Start loading slightly before reaching the bottom
    });

    const sentinel = document.getElementById('mobile-scroll-sentinel');
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [isMobile, paginatedData.length, showFullGrid]); // removed mobileVisibleCount to prevent flicker

  return (
    <>
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
      
      <div className={styles.container}>
        {!showFullGrid ? (
          <>
            <header className={styles.sectionHeader} style={{ marginTop: '3px' }}>
              <h1 className={styles.sectionTitle}>지금 뜨는 리뷰</h1>
              <div className={styles.divider}></div>
            </header>
            <div className={styles.heroWrapper}>
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
                        showNav={false} // Nav handled by parent Wrapper to stay fixed
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
                {heroPosts.map((post) => (
                  <div key={post.id} className={styles.mobileHeroItem}>
                    <HeroCard {...post} heightRatio="2/3" />
                  </div>
                ))}
              </div>
              <div className={styles.heroFrame}></div>
            </div>

            <div className={styles.gridSection}>
              <header className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>다른 리뷰</h3>
                <div className={styles.divider}></div>
                
                {filteredPosts.length > 3 && (
                  <button className={styles.viewMoreBtnInline} onClick={() => router.push('/?view=all')}>
                    전체보기 <span className={styles.btnIconInline}>+</span>
                  </button>
                )}
              </header>
              <div className={styles.gridList}>
                {displayPosts.map(post => (
                  <PosterCard key={post.id} {...post} />
                ))}
              </div>
              
              {/* Mobile Sentinel (Hidden on Main Page as requested) */}
              {isMobile && showFullGrid && displayPosts.length < (isViewMore ? otherPosts.length : totalPages * POSTS_PER_PAGE) && (
                <div id="mobile-scroll-sentinel" className={styles.sentinel}>
                  <div className={styles.shimmer}>Loading more...</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div key={animationKey} className={styles.feedAnimator}>
            {authorData && (
              <div className={styles.authorProfileCard} style={{ '--author-color': authorData.color } as React.CSSProperties}>
                <div className={styles.profileMain}>
                  <div className={styles.profileTop}>
                    <img src={authorData.avatar} alt={authorData.name} className={styles.profileAvatar} />
                    <h2 className={styles.profileName}>
                      {authorData.name} <span>Writer</span>
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
            )}

            <header className={styles.sectionHeader}>
              <h1 className={styles.sectionTitle}>{ isViewMore ? "모든 글" : displayTitle}</h1>
              
              {isViewMore && (
                <button className={styles.backToMainBtnInline} onClick={() => router.push('/')}>
                  메인으로
                </button>
              )}

              <div className={styles.divider}></div>

              {/* Inline Controls (Pagination) */}
              <div className={styles.headerControls}>
                {totalPages >= 1 && (
                  <div className={styles.pageNavInline}>
                    <span className={styles.pageInfoInline}>PAGE {currentPage + 1} / {totalPages}</span>
                    <div className={styles.pageButtonsInline}>
                      <button 
                        className={styles.pageBtnSmall} 
                        disabled={currentPage === 0}
                        onClick={() => setCurrentPage(p => p - 1)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </button>
                      <button 
                        className={styles.pageBtnSmall} 
                        disabled={currentPage >= totalPages - 1}
                        onClick={() => setCurrentPage(p => p + 1)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </header>

            <div key={isMobile ? 'mobile-grid' : `grid-${currentPage}-${animationKey}`} className={styles.gridListFade}>
              <div className={styles.gridList}>
                {displayPosts.map(post => (
                  <PosterCard key={post.id} {...post} />
                ))}
              </div>
              
              {/* Mobile Sentinel for Full Grid */}
              {isMobile && displayPosts.length < paginatedData.length && (
                <div id="mobile-scroll-sentinel" className={styles.sentinel}>
                  <div className={styles.shimmer}>Loading more...</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
