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
    <Link href={`/post/${id}`} className={styles.heroLink}>
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
                  {author.avatar.startsWith('/') || author.avatar.startsWith('http') ? (
                    <img src={author.avatar} alt={author.name} className={styles.avatarImg} />
                  ) : (
                    <span className={styles.avatarEmoji}>{author.avatar}</span>
                  )}
                  {author.name}
                  <div className={styles.authorLine} style={{ backgroundColor: author.color }}></div>
                </div>
            </div>

            <div className={styles.actions}>
              <div className={styles.readBtn}>
                리뷰 읽기
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
