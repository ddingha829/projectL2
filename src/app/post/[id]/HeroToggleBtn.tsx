"use client";

import { useState, useTransition } from "react";
import { toggleHeroPost } from "@/app/actions/hero";
import styles from "./page.module.css";

interface HeroToggleBtnProps {
  postId: string;
  initialIsHero: boolean;
}

export default function HeroToggleBtn({ postId, initialIsHero }: HeroToggleBtnProps) {
  const [isHero, setIsHero] = useState(initialIsHero);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleToggle = () => {
    startTransition(async () => {
      setMessage(null);
      const result = await toggleHeroPost(postId);

      if (result.success) {
        const newIsHero = result.action === "set";
        setIsHero(newIsHero);
        if (newIsHero) {
          setMessage({ text: "✅ 메인 히어로 카드에 지정되었습니다.", type: "success" });
        } else {
          setMessage({ text: "🔄 히어로 카드 지정이 해제되었습니다.", type: "success" });
        }
      } else {
        setMessage({ text: `❌ ${result.error}`, type: "error" });
      }

      // 메시지 3초 후 자동 사라짐
      setTimeout(() => setMessage(null), 3000);
    });
  };

  return (
    <div className={styles.heroAdminArea}>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`${styles.heroToggleBtn} ${isHero ? styles.heroToggleBtnActive : ""}`}
        title={isHero ? "히어로 카드에서 제거" : "메인 히어로 카드로 지정"}
      >
        {isPending ? (
          <span className={styles.heroSpinner} />
        ) : isHero ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            히어로 해제
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            히어로 지정
          </>
        )}
      </button>

      {message && (
        <div className={`${styles.heroMessage} ${message.type === "error" ? styles.heroMessageError : ""}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
