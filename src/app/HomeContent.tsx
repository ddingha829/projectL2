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
  filteredPosts: any[];
  displayTitle: string;
  animationKey: string;
  isInitialVisit: boolean;
}

export default function HomeContent({ 
  filteredPosts, 
  displayTitle, 
  animationKey,
  isInitialVisit 
}: HomeContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentAuthorId = searchParams.get("author");
  const isViewMore = searchParams.get("view") === "all";
  const authorData = AUTHORS.find(a => a.id === currentAuthorId);

  const [showIntro, setShowIntro] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<'next' | 'prev'>('next');
  const [currentPage, setCurrentPage] = useState(0);

  const POSTS_PER_PAGE = 8;
  
  // ... Rest stays same, but I'll insert the Profile JSX in the return

  useEffect(() => {
    if (isInitialVisit) {
      const visited = sessionStorage.getItem("introVisited");
      if (!visited) {
        // Wrap in microtask to avoid "setState in effect" warning if necessary
        Promise.resolve().then(() => setShowIntro(true));
      }
    }
  }, [isInitialVisit]);

  // Pagination reset is now handled by the 'key' prop on HomeContent in page.tsx

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
    setHeroIndex((prev) => (prev + 1) % 3);
  };

  const prevHero = (e: React.MouseEvent) => {
    e.preventDefault();
    setSlideDir('prev');
    setHeroIndex((prev) => (prev - 1 + 3) % 3);
  };

  // Split posts
  const heroPosts = filteredPosts.slice(0, 3);
  const otherPosts = filteredPosts.slice(3);

  // If we have filters, just show the grid with the title
  const isFiltered = displayTitle !== "Home";



  // Grid posts logic
  const showFullGrid = isFiltered || isViewMore || searchParams.get("view") === "all";
  const displayPosts = showFullGrid 
    ? otherPosts.slice(currentPage * POSTS_PER_PAGE, (currentPage + 1) * POSTS_PER_PAGE)
    : otherPosts.slice(0, 4);

  const totalPages = Math.ceil(otherPosts.length / POSTS_PER_PAGE);

  return (
    <>
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
      
      <div className={styles.container}>
        {!showFullGrid ? (
          <>
            <header className={styles.sectionHeader} style={{ marginTop: '8px' }}>
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
              </header>
              <div className={styles.gridList}>
                {displayPosts.map(post => (
                  <PosterCard key={post.id} {...post} />
                ))}
              </div>

              {otherPosts.length > 4 && (
                <div className={styles.viewMoreContainer}>
                  <button className={styles.viewMoreBtn} onClick={() => router.push('/?view=all')}>
                    더 보기 <span className={styles.btnIcon}>+</span>
                  </button>
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
                    {authorData.description.bio
                      .replace(/[()]/g, '')
                      .replace(/, 남,/g, ', 남성,')
                      .replace(/, 여,/g, ', 여성,')}
                  </p>
                </div>

                <div className={styles.profileDivider}></div>

                <div className={styles.profileDetail}>
                  <ul className={styles.profileBullets}>
                    {authorData.description.bullets.map((bullet, idx) => (
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
              <div className={styles.divider}></div>
            </header>
            <div key={`grid-${currentPage}-${animationKey}`} className={styles.gridListFade}>
              <div className={styles.gridList}>
                {(isViewMore ? otherPosts : filteredPosts).slice(currentPage * POSTS_PER_PAGE, (currentPage + 1) * POSTS_PER_PAGE).map(post => (
                  <PosterCard key={post.id} {...post} />
                ))}
              </div>
            </div>

            {(isViewMore || (Math.ceil(filteredPosts.length / POSTS_PER_PAGE) > 1)) && (
              <div className={styles.paginationRow}>
                {/* Left empty spacer */}
                <div className={styles.pageLeftSpacer}></div>

                {/* Center: Back to Main */}
                <div className={styles.centerControl}>
                  {isViewMore && (
                    <button className={styles.backToMainBtn} onClick={() => router.push('/')}>
                      메인으로 돌아가기
                    </button>
                  )}
                </div>

                {/* Right: Page Info + Arrows */}
                <div className={styles.rightControl}>
                  <div className={styles.pageInfo}>PAGE {currentPage + 1} / {Math.ceil((isViewMore ? otherPosts.length : filteredPosts.length) / POSTS_PER_PAGE)}</div>
                  <div className={styles.pageButtons}>
                    <button 
                      className={styles.pageBtn} 
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                    </button>
                    <button 
                      className={styles.pageBtn} 
                      disabled={currentPage >= Math.ceil((isViewMore ? otherPosts.length : filteredPosts.length) / POSTS_PER_PAGE) - 1}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
