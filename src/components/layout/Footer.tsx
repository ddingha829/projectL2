"use client";

import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer({ onCopyrightClick }: { onCopyrightClick?: () => void }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.leftGroup}>
           <Link href="/post/100003" className={styles.footerLink}>사이트 소개</Link>
           <span className={styles.divider}>|</span>
           <Link href="/privacy" className={styles.footerLink}>개인정보처리방침</Link>
           <span className={styles.divider}>|</span>
           <Link href="/notice" className={styles.footerLink}>공지사항</Link>
        </div>
        <div className={styles.rightGroup}>
          <p 
            className={styles.copyright} 
            onClick={onCopyrightClick}
            style={{ cursor: onCopyrightClick ? 'pointer' : 'default', userSelect: 'none' }}
          >
            © 2026 Team L2. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

