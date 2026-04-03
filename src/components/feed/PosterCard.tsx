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
  aspectRatio?: 'card45' | 'mag54' | 'default';
  isOneCol?: boolean;
}

export default function PosterCard({ 
  id, category, title, author, imageUrl, isEditorsPick, displayDate, likes = 0, comments = 0,
  aspectRatio = 'default', isOneCol = false 
}: PosterCardProps) {
  return (
    <article className={`${styles.card} ${aspectRatio === 'card45' ? styles.ratioCard45 : ''} ${aspectRatio === 'mag54' ? styles.ratioMag54 : ''} ${isOneCol ? styles.oneColCard : ''}`}>
      <Link href={`/post/${id}`} className={styles.link}>
        <div className={`${styles.imageWrapper} ${aspectRatio === 'mag54' ? styles.ratioMag54Wrap : ''}`}>
          <img src={imageUrl} alt={title} className={styles.posterImage} />
          <div className={styles.categoryBadge}>{category}</div>
          
          {/* Unified Author Badge */}
          <div className={styles.authorBadge}>{author.name}</div>


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
              <span className={styles.likes}>{likes}</span>
              <span className={styles.comments}>{comments}</span>
            </div>
            <div className={styles.metaRight}>
              <span className={styles.date}>{displayDate}</span>
              <span className={styles.author}>{author.name}</span>
            </div>
          </div>
        </div>

      </Link>
    </article>
  );
}
