import Link from "next/link";
import styles from "./PosterCard.module.css";

interface PosterCardProps {
  id: string;
  category: string;
  title: string;
  author: { id: string, name: string, color: string, avatar: string };
  imageUrl: string;
  isEditorsPick?: boolean;
}

export default function PosterCard({ id, category, title, author, imageUrl, isEditorsPick }: PosterCardProps) {
  return (
    <article className={styles.card}>
      <Link href={`/post/${id}`} className={styles.link}>
        <div className={styles.cardMain}>
          <div className={styles.imageWrapper}>
            <img src={imageUrl} alt={title} className={styles.posterImage} />
            <div className={styles.categoryBadge}>{category}</div>
            
            <div className={styles.titleOverlay}>
              <h3 className={styles.title}>{title}</h3>
            </div>
          </div>
          
          <div className={styles.cardMeta}>
            {isEditorsPick && (
              <div className={styles.editorsPickBadge}>
                <span className={styles.pickIcon}>🏆</span>
                PICK
              </div>
            )}
            <div className={styles.authorBadge} style={{ '--author-color': author.color } as React.CSSProperties}>
              {author.avatar.startsWith('/') || author.avatar.startsWith('http') ? (
                <img src={author.avatar} alt={author.name} className={styles.avatarImg} />
              ) : (
                <span className={styles.avatarEmoji}>{author.avatar}</span>
              )}
              <span className={styles.authorName}>{author.name}</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
