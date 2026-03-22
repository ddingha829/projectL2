import Link from "next/link";
import styles from "./HeroCard.module.css";

interface HeroCardProps {
  id: string;
  category: string;
  title: string;
  author: { id: string, name: string, color: string, avatar: string };
  likes: number;
  imageUrl: string;
}

export default function HeroCard({ id, category, title, author, likes, imageUrl }: HeroCardProps) {
  return (
    <article className={styles.hero}>
      <img src={imageUrl} alt={title} className={styles.bgImage} />
      <div className={styles.overlay}>
        <div className={styles.content}>
          <span className={styles.category}>{category}</span>
          <h2 className={styles.title}>{title}</h2>
          
          <div className={styles.meta}>
             <span className={styles.icon}>👍</span> {likes}
             <span className={styles.dot}>•</span>
             <div className={styles.authorBadge}>
               <span className={styles.avatar}>{author.avatar}</span>
               {author.name}
             </div>
          </div>

          <div className={styles.actions}>
            <Link href={`/post/${id}`} className={styles.readBtn}>
              Read Review
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
