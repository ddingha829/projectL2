"use client";

import { useState, useEffect } from "react";
import IntroAnimation from "@/components/common/IntroAnimation";
import styles from "./page.module.css";
import HeroCard from "@/components/feed/HeroCard";
import PosterCard from "@/components/feed/PosterCard";

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
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // Show intro only on initial visit to the main home page (no filters)
    if (isInitialVisit) {
      const visited = sessionStorage.getItem("introVisited");
      if (!visited) {
        setShowIntro(true);
      }
    }
  }, [isInitialVisit]);

  const handleIntroComplete = () => {
    setShowIntro(false);
    sessionStorage.setItem("introVisited", "true");
  };

  return (
    <>
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
      
      <div className={styles.container}>
        <header className={styles.feedHeader}>
          <h1 className={styles.pageTitle}>{displayTitle}</h1>
        </header>
        
        <div key={animationKey} className={styles.feedAnimator}>
          {filteredPosts.length > 0 ? (
            <>
              <HeroCard {...filteredPosts[0]} />
              
              {filteredPosts.length > 1 && (
                <div className={styles.gridSection}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>More Reviews</h3>
                    <div className={styles.divider}></div>
                  </div>
                  <div className={styles.gridList}>
                    {filteredPosts.slice(1).map(post => (
                      <PosterCard key={post.id} {...post} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <p>조건에 맞는 검색 결과가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
