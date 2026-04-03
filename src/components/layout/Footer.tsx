"use client";

import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.leftGroup}>
           <Link href="/about" className={styles.footerLink}>사이트 소개</Link>
           <span className={styles.divider}>|</span>
           <Link href="/notice" className={styles.footerLink}>공지사항</Link>
        </div>
        <div className={styles.rightGroup}>
          <p className={styles.copyright}>© 2026 Team L2. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
