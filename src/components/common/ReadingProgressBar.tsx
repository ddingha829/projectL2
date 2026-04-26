"use client";

import { useState, useEffect } from "react";
import styles from "./ReadingProgressBar.module.css";

export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollTop = window.scrollY;
      
      const totalScroll = scrollHeight - clientHeight;
      if (totalScroll === 0) return;
      
      const currentProgress = (scrollTop / totalScroll) * 100;
      setProgress(currentProgress);
    };

    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div className={styles.progressContainer}>
      <div 
        className={styles.progressBar} 
        style={{ width: `${progress}%` }} 
      />
    </div>
  );
}
