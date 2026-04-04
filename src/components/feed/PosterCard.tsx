import Link from "next/link";
import styles from "./PosterCard.module.css";

interface PosterCardProps {
  id: string;
  category: string;
  title: string;
  author: { id: string, name: string, color: string, avatar: string };
  imageUrl: string;
  isEditorsPick?: boolean;
  displayDate?: string;
  likes?: number;
  comments?: number;
  aspectRatio?: 'card45' | 'mag53' | 'default';
  isOneCol?: boolean;
  isDense?: boolean;
}

export default function PosterCard({ 
  id, category, title, author, imageUrl, isEditorsPick, displayDate, likes = 0, comments = 0,
  aspectRatio = 'default', isOneCol = false, isDense = false 
}: PosterCardProps) {
  return (
    <article className={`${styles.card} ${aspectRatio === 'card45' ? styles.ratioCard45 : ''} ${aspectRatio === 'mag53' ? styles.ratioMag53 : ''} ${isOneCol ? styles.oneColCard : ''} ${isDense ? styles.denseCard : ''}`}>
      <Link href={`/post/${id}`} className={styles.link}>
        <div className={styles.imageWrapper}>
          <img src={imageUrl} alt={title} className={styles.posterImage} />
          <div className={styles.categoryBadge}>{category}</div>
          
          {/* Unified Author Badge */}
          <Link href={`/?author=${author.id}`} className={styles.authorBadge} onClick={(e) => e.stopPropagation()}>
            {author.name}
          </Link>


          {isEditorsPick && (
            <div className={styles.pickBadgeInline}>
              <span className={styles.pickIcon}>🏆</span>
              PICK
            </div>
          )}
        </div>

        <div className={styles.contentArea}>
          <h3 className={styles.title}>
            {title}
          </h3>
          
          <div className={styles.metaInfo}>
            <div className={styles.metaLeft}>
              <span className={styles.metaItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.metaIcon}>
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                </svg>
                {likes}
              </span>
              <span className={styles.metaItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.metaIcon}>
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                {comments}
              </span>
            </div>
            <div className={styles.metaRight}>
              <span className={styles.date}>{displayDate}</span>
            </div>
          </div>
        </div>

      </Link>
    </article>
  );
}
