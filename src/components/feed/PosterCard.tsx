import Link from "next/link";
import styles from "./PosterCard.module.css";

interface PosterCardProps {
  id: string;
  category: string;
  title: string;
  author: { id: string, name: string, color: string, avatar: string };
  imageUrl: string;
}

export default function PosterCard({ id, category, title, author, imageUrl }: PosterCardProps) {
  return (
    <article className={styles.card}>
      <Link href={`/post/${id}`} className={styles.link}>
        <div className={styles.imageWrapper}>
          <img src={imageUrl} alt={title} className={styles.posterImage} />
          <div className={styles.categoryBadge}>{category}</div>
        </div>
        <div className={styles.content}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.footer}>
            <div className={styles.authorGroup}>
              <span className={styles.author}>{author.name}</span>
              <div className={styles.authorLine} style={{ backgroundColor: author.color }}></div>
            </div>
            {author.avatar.startsWith('/') || author.avatar.startsWith('http') ? (
              <img src={author.avatar} alt={author.name} className={styles.avatarImg} />
            ) : (
              <span className={styles.avatarEmoji}>{author.avatar}</span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
