import Link from "next/link";
import Image from "next/image";
import styles from "../../app/page.module.css";

export function EditorsSection({ editors, isMobile }: { editors: any[], isMobile: boolean }) {
  return (
    <div className={styles.editorsSection}>
      <header className={styles.sectionHeader} style={{ marginTop: isMobile ? '12px' : '25px' }}>
        <h2 className={styles.sectionTitle}>티끌러</h2>
        <div className={styles.headerSpacer}></div>
      </header>
      <div className={styles.editorsGrid}>
        {editors.map((ed: any) => (
          <Link key={ed.id} href={`/?author=${ed.id}`} className={styles.editorProfileCard}>
            <div className={styles.edAvatarWrapper}>
              <Image 
                src={(ed.avatar_url && (ed.avatar_url.startsWith('http') || ed.avatar_url.startsWith('/'))) ? ed.avatar_url : "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                alt={ed.display_name} 
                className={styles.edAvatarImg} 
                width={100}
                height={100}
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div className={styles.edInfo}>
              <h3 className={styles.edName}>{ed.display_name}</h3>
              <span className={styles.edRole}>{ed.role === 'admin' ? '운영자' : '티끌러'}</span>
              <p className={styles.edBio}>
                {ed.bio || "생동감 넘치는 리뷰를 작성하는 티끌러입니다."}
              </p>
            </div>
            {ed.bullets && ed.bullets.length > 0 && (
              <div className={styles.edBullets}>
                {ed.bullets.slice(0, 3).map((b: string, i: number) => (
                  <span key={i} className={styles.edBulletPill}>{b}</span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
