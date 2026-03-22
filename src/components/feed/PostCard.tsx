import Link from "next/link";
import styles from "./PostCard.module.css";

interface PostCardProps {
  id: string;
  category: string;
  title: string;
  content: string;
  author: { id: string, name: string, color: string, avatar: string };
  date: string;
  likes: number;
  comments: number;
  imageUrl: string;
}

export default function PostCard({
  id,
  category,
  title,
  content,
  author,
  date,
  likes,
  comments,
  imageUrl,
}: PostCardProps) {
  return (
    <article className={styles.card}>
      <Link href={`/post/${id}`} className={styles.imageLink}>
        <div className={styles.imageWrapper}>
          <img src={imageUrl} alt={title} className={styles.bannerImage} />
          <div className={styles.imageOverlay}>
            <span className={styles.categoryBadge}>{category}</span>
          </div>
        </div>
      </Link>
      
      <div className={styles.contentArea}>
        <div className={styles.header}>
          <div className={styles.authorBadge} style={{ borderColor: author.color }}>
            <span className={styles.avatar}>{author.avatar}</span>
            <span className={styles.authorName}>{author.name}</span>
          </div>
          <span className={styles.date}>{date}</span>
        </div>
        
        <Link href={`/post/${id}`} className={styles.contentLink}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.contentPreview}>{content}</p>
        </Link>
        
        <div className={styles.footer}>
          <button className={styles.actionBtn}>
            <span className={styles.icon}>👍</span> {likes}
          </button>
          <Link href={`/post/${id}#comments`} className={styles.actionBtn}>
            <span className={styles.icon}>💬</span> {comments}
          </Link>
        </div>
      </div>
    </article>
  );
}
