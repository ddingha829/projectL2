import styles from "./SkeletonCard.module.css";

export default function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.imagePlaceholder}>
        <div className={styles.shimmer}></div>
      </div>
      <div className={styles.contentPlaceholder}>
        <div className={styles.titleLine}>
           <div className={styles.shimmer}></div>
        </div>
        <div className={styles.titleLineShort}>
           <div className={styles.shimmer}></div>
        </div>
        <div className={styles.metaRow}>
          <div className={styles.metaCircle}>
             <div className={styles.shimmer}></div>
          </div>
          <div className={styles.metaLine}>
             <div className={styles.shimmer}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
