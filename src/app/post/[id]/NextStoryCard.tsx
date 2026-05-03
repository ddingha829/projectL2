import Link from "next/link";
import Image from "next/image";
import styles from "./NextStoryCard.module.css";
import { CATEGORY_MAP } from "@/lib/constants/categories";

interface RecommendedPost {
  id: string;
  serial_id?: number;
  title: string;
  image_url?: string;
  category: string;
}



export default function NextStoryCard({ post }: { post: RecommendedPost | null }) {
  if (!post) return null;

  const displayCategory = CATEGORY_MAP[post.category] || post.category;
  const href = post.serial_id ? `/post/${post.serial_id}` : `/post/db-${post.id}`;

  return (
    <div className={styles.wrapper}>
      <div className={styles.labelArea}>
        <span className={styles.mainLabel}>NEXT EDITORIAL</span>
        <span className={styles.subLabel}>이 티끌도 읽어보세요</span>
      </div>
      
      <Link href={href} className={styles.card}>
        {/* Left Side: Image */}
        <div className={styles.imageSide}>
          {post.image_url ? (
            <Image 
              src={post.image_url} 
              alt={post.title}
              fill
              className={styles.thumbImage}
              sizes="220px"
            />
          ) : (
            <div className={styles.placeholderImage}>TICGLE</div>
          )}
        </div>

        {/* Right Side: Content */}
        <div className={styles.contentSide}>
          <div className={styles.metaArea}>
             <span className={styles.categoryBadge}>{displayCategory}</span>
          </div>
          <h3 className={styles.title}>{post.title}</h3>
          <div className={styles.cta}>
            읽어보기 
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </Link>
    </div>
  );
}
