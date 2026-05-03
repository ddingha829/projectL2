"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_MAP } from "@/lib/constants/categories";
import styles from "./MagazineArchive.module.css";

interface MagazineArchiveClientProps {
  initialIssues: any[];
}

const stripHtml = (html: string) => {
  if (!html) return "";
  // <p>, <br>, <div> 태그를 줄바꿈 문자로 변환하여 줄바꿈 유지
  let text = html.replace(/<\/p>|<br\s*\/?>|<\/div>/gi, "\n");
  return text.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ");
};

export default function MagazineArchiveClient({ initialIssues }: MagazineArchiveClientProps) {
  const [selectedIssueIdx, setSelectedIssueIdx] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for older, 1 for newer
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const currentIssue = initialIssues[selectedIssueIdx];
  const allPosts = currentIssue ? [
    currentIssue.post_a,
    currentIssue.post_b1,
    currentIssue.post_b2,
    currentIssue.post_b3
  ].filter(Boolean) : [];

  const handlePrev = () => {
    if (selectedIssueIdx < initialIssues.length - 1) {
      setDirection(-1);
      setSelectedIssueIdx(selectedIssueIdx + 1);
    }
  };

  const handleNext = () => {
    if (selectedIssueIdx > 0) {
      setDirection(1);
      setSelectedIssueIdx(selectedIssueIdx - 1);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div className={styles.archiveContainer}>
      {/* Top Controls: Issue Selector */}
      <div className={styles.topControls}>
        <div className={styles.issueSelectorWrap}>
          <button 
            className={styles.navArrow} 
            onClick={handlePrev}
            disabled={selectedIssueIdx === initialIssues.length - 1}
          >
            ←
          </button>
          <div className={styles.issueInfo}>
            <span className={styles.issueLabel}>TICGLE MAGAZINE</span>
            <span className={styles.issueNumber}>VOL. {currentIssue?.issue_number}</span>
          </div>
          <button 
            className={styles.navArrow} 
            onClick={handleNext}
            disabled={selectedIssueIdx === 0}
          >
            →
          </button>
        </div>
      </div>

      {/* Snap Scrollable Stories */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div 
          key={currentIssue?.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          className={styles.snapScrollContainer} 
          ref={scrollRef}
        >
          {allPosts.map((post, idx) => (
            <section key={`${currentIssue.id}-${post.id}`} className={styles.storySection}>
              <Link href={`/post/${post.serial_id || post.id}`} className={styles.storyLink}>
                <div className={styles.bgWrapper}>
                  <Image
                    src={post.image_url}
                    alt={post.title}
                    fill
                    priority={idx === 0}
                    className={styles.bgImage}
                  />
                  <div className={styles.vignette} />
                </div>

                <div className={styles.contentArea}>
                  <motion.div 
                    className={styles.storyMeta}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    <span className={styles.storyIndex}>STORY 0{idx + 1}</span>
                    <span className={styles.storyCategory}>{CATEGORY_MAP[post.category] || post.category}</span>
                  </motion.div>

                  <motion.h2 
                    className={styles.storyTitle}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 1 }}
                  >
                    {post.title}
                  </motion.h2>

                  <motion.p
                    className={styles.storyExcerpt}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                  >
                    {stripHtml(post.content).slice(0, 180)}...
                  </motion.p>

                  <motion.div 
                    className={styles.viewAction}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  >
                    <span className={styles.viewBtn}>READ STORY</span>
                  </motion.div>
                </div>
              </Link>
            </section>
          ))}
        </motion.div>
      </AnimatePresence>

      <div className={styles.brandLogo}>TICGLE</div>
    </div>
  );
}
