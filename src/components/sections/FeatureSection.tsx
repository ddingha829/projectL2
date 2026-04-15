import Link from "next/link";
import Image from "next/image";
import styles from "../../app/page.module.css";

export function FeatureSection({ featurePosts, isMobile }: { featurePosts: any[], isMobile: boolean }) {
  return (
    <div className={styles.featureSection}>
      <header className={styles.sectionHeader} style={{ marginTop: isMobile ? '12px' : '25px' }}>
        <h2 className={styles.sectionTitle}>태산 : 티끌 모아 봄</h2>
        <div className={styles.headerSpacer}></div>
        <Link href="/?category=feature" className={styles.viewAllLink}>
          MORE <span className={styles.linkIcon}>{'>'}</span>
        </Link>
      </header>
      <div className={styles.featureGrid}>
        {(featurePosts.length > 0 ? featurePosts : [
          { id: 'f1', title: '티끌러 선정 2026.4 최고의 점심메뉴', imageUrl: 'https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?auto=format&fit=crop&w=1600&q=80' }
        ]).map((feature: any) => (
          <Link key={feature.id} href={feature.id.startsWith('db-') ? `/post/${feature.id}` : '#'} className={styles.featureBanner}>
            <Image 
              src={feature.imageUrl} 
              alt={feature.title} 
              className={styles.featureImage} 
              fill
              sizes="(max-width: 768px) 100vw, 1200px"
              quality={80}
              style={{ objectFit: 'cover' }}
            />
            <div className={styles.featureOverlay}>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
