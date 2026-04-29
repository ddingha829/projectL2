"use client";

import styles from "../../app/page.module.css";
import Link from "next/link";
import Image from "next/image";
import SectionLayout from "@/components/shared/SectionLayout";

export function FeatureSection({ featurePosts, isMobile }: { featurePosts: any[], isMobile: boolean }) {
  return (
    <SectionLayout
      titleHighlight="티끌"
      title=""
      titleSuffix=" 모은 태산"
      moreHref="/?category=feature"
      showMore
      noGrid
      className={styles.featureSection}
    >
      <div className={styles.featureGrid}>
        {(featurePosts.length > 0 ? featurePosts : [
          { id: 'f1', title: '티끌러 선정 2026.4 최고의 점심메뉴', imageUrl: 'https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?auto=format&fit=crop&w=1600&q=80' }
        ]).map((feature: any) => (
          <Link key={feature.id} href={feature.id.startsWith('f') ? '#' : `/post/${feature.id}`} className={styles.featureBanner}>
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
    </SectionLayout>
  );
}
