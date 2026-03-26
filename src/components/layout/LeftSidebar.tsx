"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./LeftSidebar.module.css";
import React, { Suspense } from "react";

import { AUTHORS } from "@/lib/constants/authors";
import { MOCK_NOTICE } from "@/lib/constants/notice";
import HeroCard from "@/components/feed/HeroCard";

const CATEGORIES = [
  { id: "movie", name: "영화", icon: "🎬" },
  { id: "book", name: "책", icon: "📚" },
  { id: "game", name: "게임", icon: "🎮" },
  { id: "restaurant", name: "맛집", icon: "🍽️" },
  { id: "travel", name: "여행", icon: "✈️" },
  { id: "exhibition", name: "전시회", icon: "🖼️" },
  { id: "other", name: "기타", icon: "✨" },
];

function SidebarContent({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category");
  const currentAuthor = searchParams.get("author");

  const handleFilter = (type: "category" | "author", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (params.get(type) === value) {
      params.delete(type);
    } else {
      params.set(type, value);
    }
    
    router.push(`/?${params.toString()}`);
    if (onClose) onClose();
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
      <div className={styles.section} style={{ marginBottom: '16px' }}>
        <h3 className={styles.sectionTitle}>Notice</h3>
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-light)', backgroundColor: '#000' }}>
          <HeroCard {...MOCK_NOTICE} heightRatio="compact" />
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Categories</h3>
        <ul className={styles.menuList}>
          {CATEGORIES.map((cat) => (
            <li key={cat.id} className={styles.menuItem}>
              <button 
                onClick={() => handleFilter("category", cat.id)}
                className={`${styles.menuBtn} ${currentCategory === cat.id ? styles.active : ""}`}
              >
                <span className={styles.icon}>{cat.icon}</span>
                <span className={styles.name}>{cat.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Writers</h3>
        <ul className={styles.menuList}>
          {AUTHORS.map((author) => (
            <li key={author.id} className={styles.menuItem}>
              <div className={styles.userContainer}>
                <button 
                  onClick={() => handleFilter("author", author.id)}
                  className={`${styles.userBtn} ${currentAuthor === author.id ? styles.active : ""}`}
                >
                  <div className={styles.userInfo}>
                    <img src={author.avatar} alt={author.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                    <span className={styles.name}>{author.name}</span>
                  </div>
                  <div className={styles.colorLine} style={{ backgroundColor: author.color }}></div>
                </button>
                <div className={styles.authorTooltip}>
                  <p className={styles.tooltipBio}>{author.description.bio}</p>
                  <ul className={styles.tooltipBullets}>
                    {author.description.bullets.map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default function LeftSidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  return (
    <Suspense fallback={<aside className={styles.sidebar}></aside>}>
      <SidebarContent isOpen={isOpen} onClose={onClose} />
    </Suspense>
  );
}
