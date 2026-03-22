import styles from "./PostCard.module.css";
import Link from "next/link";

interface PostCardProps {
  id: string;
  category: string;
  title: string;
  content: string;
  author: string;
  date: string;
  likes: number;
  comments: number;
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
}: PostCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.category}>{category}</span>
          <span className={styles.dot}>•</span>
          <span className={styles.author}>{author}</span>
          <span className={styles.dot}>•</span>
          <span className={styles.date}>{date}</span>
        </div>
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
    </article>
  );
}
