"use client";

import styles from "../../app/page.module.css";
import Link from "next/link";
import Image from "next/image";

export function EditorsSection({ editors, isMobile, allPosts = [] }: { editors: any[], isMobile: boolean, allPosts?: any[] }) {
  return (
    <div className={styles.editorsSection}>
      <header className={styles.sectionHeader} style={{ marginTop: isMobile ? '12px' : '25px' }}>
        <h2 className={styles.sectionTitle}>티끌러</h2>
        <div className={styles.headerSpacer}></div>
      </header>
      <div className={styles.editorsGrid}>
        {editors
          .map(ed => {
            const authorPosts = allPosts.filter(
              p => (String(p.author?.id) === String(ed.id) || String(p.author_id) === String(ed.id)) && p.categoryId !== 'notice'
            );
            const totalViews = authorPosts.reduce((sum, p) => sum + (p.views || 0), 0);
            return { ...ed, postCount: authorPosts.length, totalViews };
          })
          .sort((a, b) => b.totalViews - a.totalViews)
          .map((ed: any) => (
            <Link key={ed.id} href={`/?author=${ed.id}`} className={styles.editorProfileCard}>
              {/* Large rounded-square profile photo */}
              <div className={styles.edPhotoWrap}>
                <Image
                  src={(ed.avatar_url && (ed.avatar_url.startsWith('http') || ed.avatar_url.startsWith('/'))) ? ed.avatar_url : "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"}
                  alt={ed.display_name}
                  className={styles.edPhoto}
                  width={200}
                  height={200}
                  style={{ objectFit: 'cover' }}
                />
              </div>

              {/* Name + Bio */}
              <div className={styles.edCardBody}>
                <h3 className={styles.edName}>{ed.display_name}</h3>
                <p className={styles.edBio}>
                  {ed.bio || "생동감 넘치는 리뷰를 작성하는 티끌러입니다."}
                </p>
              </div>

              {/* Bottom stats + link */}
              <div className={styles.edCardFooter}>
                <div className={styles.edStats}>
                  <span className={styles.edStat} title="전체 게시물 수">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                    {ed.postCount}
                  </span>
                  <span className={styles.edStat} title="전체 조회수">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    {ed.totalViews.toLocaleString()}
                  </span>
                </div>
                <span className={styles.edFollowLink}>게시물 보러가기</span>
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
