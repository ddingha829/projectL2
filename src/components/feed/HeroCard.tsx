import Link from "next/link";
import styles from "./HeroCard.module.css";

interface HeroCardProps {
  id: string;
  category: string;
  title: string;
  author: { id: string, name: string, color: string, avatar: string };
  likes: number;
  imageUrl: string;
  heightRatio?: '1/3' | '2/3' | 'full' | 'compact';
  onPrev?: (e: React.MouseEvent) => void;
  onNext?: (e: React.MouseEvent) => void;
  showNav?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

export default function HeroCard({ 
  id, category, title, author, likes, imageUrl, 
  heightRatio = 'full', onPrev, onNext, showNav,
  currentIndex = 0, totalCount = 3
}: HeroCardProps) {
  const containerStyle = heightRatio === '1/3' ? styles.heightOneThird : 
                        heightRatio === '2/3' ? styles.heightTwoThird : 
                        heightRatio === 'compact' ? styles.heightCompact :
                        styles.heightFull;

  return (
    <article className={`${styles.hero} ${containerStyle}`}>
      <img src={imageUrl} alt={title} className={styles.bgImage} />
      <div className={styles.overlay}>
        <Link href={`/post/${id}`} className={styles.contentLink}>
          <div className={styles.content}>
            {heightRatio === 'compact' ? (
              <h2 className={styles.title}>{title}</h2>
            ) : (
              <>
                <span className={styles.category}>{category}</span>
                <h2 className={styles.title}>{title}</h2>
                <div className={styles.meta}>
                   <span className={styles.likes}><span className={styles.icon}>👍</span> {likes}</span>
                   <span className={styles.dot}>•</span>
                    <div className={styles.authorBadge} style={{ backgroundColor: `${author.color}22`, border: `1px solid ${author.color}44` }}>
                      {author.avatar.startsWith('/') || author.avatar.startsWith('http') ? (
                        <img src={author.avatar} alt={author.name} className={styles.avatarImg} />
                      ) : (
                        <span className={styles.avatarEmoji}>{author.avatar}</span>
                      )}
                      <span className={styles.authorName}>{author.name}</span>
                    </div>
                </div>
              </>
            )}
          </div>
        </Link>
      </div>

      {showNav && (
        <div className={styles.navButtons}>
          <button className={styles.navBtn} onClick={onPrev}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div className={styles.navDots}>
            {Array.from({ length: totalCount }).map((_, idx) => (
              <span 
                key={idx} 
                className={idx === currentIndex ? styles.activeDot : styles.inactiveDot}
              ></span>
            ))}
          </div>
          <button className={styles.navBtn} onClick={onNext}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      )}
    </article>
  );
}
