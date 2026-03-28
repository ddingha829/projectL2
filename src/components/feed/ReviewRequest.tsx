"use client";

import Link from "next/link";
import styles from "./ReviewRequest.module.css";

interface ReviewRequestProps {
  writerId: string;
  color: string;
}

export default function ReviewRequest({ writerId, color }: ReviewRequestProps) {
  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <Link 
          href={`/requests/${writerId}`}
          className={styles.toggleBtn} 
          style={{ '--author-color': color } as React.CSSProperties}
        >
          <span className={styles.btnIcon}>💬</span>
          작가님, 이런 리뷰도 보고싶어요!
        </Link>
      </div>
    </div>
  );
}
