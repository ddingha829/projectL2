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
}

export default function PosterCard({ 
  id, category, title, author, imageUrl, isEditorsPick, displayDate, likes = 0 
}: PosterCardProps) {
  return (
    <article className={styles.card}>
      <Link href={`/post/${id}`} className={styles.link}>
        <div className={styles.cardMain}>
          <div className={styles.imageWrapper}>
            <img src={imageUrl} alt={title} className={styles.posterImage} />
            <div className={styles.categoryBadge}>{category}</div>

            {isEditorsPick && (
              <div className={styles.pickBadgeInline}>
                <span className={styles.pickIcon}>🏆</span>
                PICK
              </div>
            )}

            <div className={styles.titleOverlay}>
              <h3 className={styles.title}>{title}</h3>
              {/* Metadata split: Likes on left, Date/Author on right */}
              <div className={styles.metaInfo}>
                <span className={styles.likes}>👍 {likes}</span>
                <div className={styles.metaRight}>
                  <span className={styles.date}>{displayDate}</span>
                  <span className={styles.author}>{author.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
