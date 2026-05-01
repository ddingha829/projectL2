"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./DynamicIssueCover.module.css";

interface DynamicIssueCoverProps {
  posts: any[];
  issueNumber: string;
}

export default function DynamicIssueCover({ posts, issueNumber }: DynamicIssueCoverProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const mainPost = posts[0];
  const subPosts = posts.slice(1, 4);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isVisible) return;
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth - 0.5) * 30;
      const y = (clientY / innerHeight - 0.5) * 30;
      setMousePos({ x, y });
    };

    const handleScrollTrigger = (e: WheelEvent) => {
      if (!isVisible) return;
      if (e.deltaY > 10) handleStart(); // 아래로 스크롤 시 닫기
    };

    const handleTouchTrigger = (e: TouchEvent) => {
      if (!isVisible) return;
      // 터치 이동이 위쪽 방향일 때 닫기 (추후 터치 시작/종료 좌표로 정밀화 가능)
      handleStart();
    };

    // 커버가 보일 때는 본문 스크롤 방지
    if (isVisible) {
      document.body.style.overflow = "hidden";
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("wheel", handleScrollTrigger);
    window.addEventListener("touchstart", handleTouchTrigger);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("wheel", handleScrollTrigger);
      window.removeEventListener("touchstart", handleTouchTrigger);
      document.body.style.overflow = "auto";
    };
  }, [isVisible]);

  const handleStart = () => {
    setIsVisible(false);
    document.body.style.overflow = "auto";
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className={styles.fullScreenOverlay}
        initial={{ opacity: 1 }}
        exit={{ y: "-100%", opacity: 0 }}
        transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
      >
        <motion.div 
          className={styles.bgWrapper}
          animate={{ 
            x: mousePos.x * -0.5, 
            y: mousePos.y * -0.5,
            scale: 1.1
          }}
        >
          <Image
            src={mainPost.imageUrl || mainPost.image_url}
            alt={mainPost.title}
            fill
            priority
            className={styles.bgImage}
          />
          <div className={styles.vignette} />
        </motion.div>

        <div className={styles.contentArea}>
          <motion.div 
            className={styles.issueInfo}
            animate={{ x: mousePos.x * 0.2, y: mousePos.y * 0.2 }}
          >
            <span className={styles.issueLabel}>NEW ISSUE</span>
            <span className={styles.issueNumber}>VOL. {issueNumber}</span>
          </motion.div>

          <motion.h1 
            className={styles.mainTitle}
            animate={{ x: mousePos.x * 0.8, y: mousePos.y * 0.8 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, x: mousePos.x * 0.8, y: mousePos.y * 0.8 }}
            transition={{ delay: 0.3, duration: 1 }}
          >
            {mainPost.title}
          </motion.h1>

          {/* Sub Stories (B-Cards) */}
          <motion.div 
            className={styles.subStories}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
          >
            {subPosts.map((sp, idx) => (
              <div key={sp.id} className={styles.subStoryItem}>
                <span className={styles.subStoryNum}>0{idx + 1}</span>
                <h3 className={styles.subStoryTitle}>{sp.title}</h3>
              </div>
            ))}
          </motion.div>

          <motion.div 
            className={styles.actionArea}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            <button className={styles.exploreBtn} onClick={handleStart}>
              START READING
              <span className={styles.btnLine} />
            </button>
            <div className={styles.scrollIndicator}>
              <div className={styles.mouseWheel} />
              <span>SCROLL TO EXPLORE</span>
            </div>
          </motion.div>
        </div>

        <div className={styles.brandLogo}>
          TICGLE
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
