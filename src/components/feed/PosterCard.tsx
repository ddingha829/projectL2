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
        <div className={styles.imageWrapper}>
          <img src={imageUrl} alt={title} className={styles.posterImage} />
          <div className={styles.categoryBadge}>{category}</div>
          {isEditorsPick && (
            <div className={styles.editorsPickBadge}>
              <span className={styles.pickIcon}>🏆</span>
              공들여 씀
            </div>
          )}
        </div>
        <div className={styles.content}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.footer}>
            <div className={styles.authorBadge} style={{ backgroundColor: `${author.color}22`, border: `1px solid ${author.color}44` }}>
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
