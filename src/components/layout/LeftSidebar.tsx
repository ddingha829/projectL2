"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./LeftSidebar.module.css";
import React, { Suspense } from "react";

const CATEGORIES = [
  { id: "movie", name: "영화", icon: "🎬" },
  { id: "book", name: "책", icon: "📚" },
  { id: "game", name: "게임", icon: "🎮" },
  { id: "restaurant", name: "맛집", icon: "🍽️" },
  { id: "other", name: "기타", icon: "✨" },
];

const AUTHORS = [
  { id: "chulsoo", name: "철수", color: "#FF3333", avatar: "👨" },
  { id: "younghee", name: "영희", color: "#33CCFF", avatar: "👩" },
  { id: "minsoo", name: "민수", color: "#33FF99", avatar: "👦" },
  { id: "jieun", name: "지은", color: "#FF9933", avatar: "👧" },
  { id: "donghyun", name: "동현", color: "#B833FF", avatar: "👱" },
];

function SidebarContent({ isOpen }: { isOpen?: boolean }) {
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
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
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
              <button 
                onClick={() => handleFilter("author", author.id)}
                className={`${styles.userBtn} ${currentAuthor === author.id ? styles.active : ""}`}
              >
                <div className={styles.userInfo}>
                  <span className={styles.avatar}>{author.avatar}</span>
                  <span className={styles.name}>{author.name}</span>
                </div>
                <div className={styles.colorIndicator} style={{ backgroundColor: author.color }}></div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default function LeftSidebar({ isOpen }: { isOpen?: boolean }) {
  return (
    <Suspense fallback={<aside className={styles.sidebar}></aside>}>
      <SidebarContent isOpen={isOpen} />
    </Suspense>
  );
}
