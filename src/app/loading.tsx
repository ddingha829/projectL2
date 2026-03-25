import styles from "./page.module.css";

export default function Loading() {
  return (
    <div className={styles.container}>
      <header className={styles.feedHeader}>
        <div className={styles.skeletonTitle}></div>
      </header>
      
      <div className={styles.skeletonAnimator}>
        {/* Placeholder for Hero Card */}
        <div className={styles.skeletonHero}></div>
        
        {/* Placeholder for Grid Items */}
        <div className={styles.gridSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.skeletonSubTitle}></div>
            <div className={styles.divider}></div>
          </div>
          <div className={styles.skeletonGridList}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={styles.skeletonPoster}></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
