"use client";

import styles from "../../app/page.module.css";
import Link from "next/link";

export function ReviewsSection({ recentReviews, isMobile, scrollReviews, reviewRef, router, MOCK_REVIEWS }: any) {
  return (
    <div className={styles.recentReviewsSection}>
      <header className={styles.sectionHeader} style={{ marginTop: isMobile ? '12px' : '15px' }}>
        <h2 className={styles.sectionTitle} style={{ paddingLeft: '8px' }}>한줄 <span style={{ color: '#ff4804' }}>평</span></h2>
        <div className={styles.headerSpacer}></div>
      </header>
      <div className={styles.recentReviewsWrapper}>
        <button className={`${styles.scrollBtn} ${styles.scrollBtnLeft}`} onClick={() => scrollReviews('left')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div className={styles.reviewHorizontalGrid} ref={reviewRef}>
          {(recentReviews && recentReviews.length > 0 ? recentReviews : MOCK_REVIEWS).slice(0, 7).map((rev: any) => (
            <div 
              key={rev.id} 
              className={styles.miniReviewCard} 
              onClick={() => rev.postId && router.push(`/post/db-${rev.postId}`)}
              style={{ cursor: rev.postId ? 'pointer' : 'default' }}
            >
              <h4 className={styles.miniRevSubject}>{rev.subject}</h4>
              {(rev.address || rev.category) && (
                <div className={styles.miniRevLocation}>
                  {rev.category || rev.address}
                </div>
              )}
              <div className={styles.miniRevRating}>
                <div className={styles.miniRevInnerRow}>
                  <div className={styles.miniRevStars}>
                    {[1, 2, 3, 4, 5].map(i => {
                      const fill = Math.min(Math.max(rev.rating - (i - 1), 0), 1) * 100;
                      return (
                        <span key={i} className={styles.starWrapper}>
                          <span className={styles.starBase}>★</span>
                          <span className={styles.starFill} style={{ width: `${fill}%` }}>★</span>
                        </span>
                      );
                    })}
                  </div>
                  <span className={styles.miniRevScore}>{rev.rating}</span>
                </div>
              </div>
              <p className={styles.miniRevText}>{rev.comment || "작성된 한줄평이 없습니다."}</p>
              <div className={styles.miniRevDateRow}>
                <span className={styles.miniRevDate}>{new Date(rev.date).toLocaleDateString()}</span>
              </div>
              <div className={styles.miniRevFooter}>
                <span className={styles.miniRevAuthor}>{rev.authorName}</span>
                {rev.postId && (
                  <Link href={`/reviews?search=${encodeURIComponent(rev.subject)}`} className={styles.miniRevLink} onClick={(e) => e.stopPropagation()}>티끌플레이스</Link>
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
  );
}
