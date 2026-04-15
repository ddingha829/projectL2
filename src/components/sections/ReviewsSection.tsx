import Link from "next/link";
import styles from "../../app/page.module.css";

export function ReviewsSection({ recentReviews, MOCK_REVIEWS, isMobile, scrollReviews, reviewRef, router }: any) {
  return (
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
          {(recentReviews && recentReviews.length > 0 ? recentReviews : MOCK_REVIEWS).slice(0, 7).map((rev: any) => (
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
  );
}
