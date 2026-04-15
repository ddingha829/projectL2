import Link from "next/link";
import Image from "next/image";
import styles from "./HeroCard.module.css";

interface HeroCardProps {
  id: string;
  category: string;
  title: string;
  author: { id: string, name: string, color: string, avatar: string };
  likes: number;
  comments: number;
  imageUrl: string;
  heightRatio?: '1/3' | '2/3' | 'full' | 'compact';
  onPrev?: (e: React.MouseEvent) => void;
  onNext?: (e: React.MouseEvent) => void;
  showNav?: boolean;
  currentIndex?: number;
  totalCount?: number;
  isEditorsPick?: boolean;
  displayDate?: string;
}

export default function HeroCard({ 
  id, category, title, author, likes, comments, imageUrl, 
  heightRatio = 'full', onPrev, onNext, showNav,
  currentIndex = 0, totalCount = 3, isEditorsPick,
  displayDate
}: HeroCardProps) {
  const containerStyle = heightRatio === '1/3' ? styles.heightOneThird : 
                        heightRatio === '2/3' ? styles.heightTwoThird : 
                        heightRatio === 'compact' ? styles.heightCompact :
                        styles.heightFull;

  return (
    <article className={`${styles.hero} ${containerStyle}`}>
      <Image 
        src={imageUrl} 
        alt={title} 
        className={styles.bgImage} 
        fill
        priority
        sizes="100vw"
        style={{ objectFit: 'cover' }}
      />
      <div className={styles.overlay}>
        <Link href={`/post/${id}`} className={styles.contentLink}>
            <div className={styles.header}>
              <div className={styles.categoryBadge}>
                {category?.toUpperCase() === "NOTICE" || category === "공지사항" ? "공지사항" : category}
              </div>
              {isEditorsPick && (
                <div className={styles.editorsPick}>
                  🏆 공들여 씀
                </div>
              )}
            </div>

            <div className={styles.content}>
              {heightRatio === 'compact' ? (
                <h2 className={styles.title} style={title.length > 50 ? { fontSize: '0.75em' } : title.length > 35 ? { fontSize: '0.85em' } : {}}>{title}</h2>
              ) : (
                <>
                  <h2 className={styles.title} style={title.length > 50 ? { fontSize: '0.75em' } : title.length > 35 ? { fontSize: '0.85em' } : {}}>{title}</h2>
                  
                  <div className={styles.footer}>
                    <div className={styles.authorSection}>
                      <div className={styles.avatarWrapper}>
                        {author.avatar.startsWith("/") || author.avatar.startsWith("http") ? (
                          <img src={author.avatar} alt={author.name} className={styles.avatarImg} />
                        ) : (
                          <span className={styles.avatarEmoji}>{author.avatar}</span>
                        )}
                      </div>
                      <div className={styles.authorNameBadge}>
                        <span className={styles.authorName}>{author.name}</span>
                      </div>
                    </div>
                    
                    <div className={styles.meta}>
                      <span className={styles.likes}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.metaIcon}>
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        {likes}
                      </span>
                      <span className={styles.comments}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.metaIcon}>
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        {comments}
                      </span>
                      <span className={styles.date}>{displayDate}</span>
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
