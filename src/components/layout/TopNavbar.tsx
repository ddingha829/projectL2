"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./TopNavbar.module.css";

export default function TopNavbar({ onMobileToggle }: { onMobileToggle?: () => void }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleToggle = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <button className={styles.hamburgerBtn} onClick={onMobileToggle}>
          <span className={styles.hamburgerIcon}>≡</span>
        </button>
        <div className={styles.logo}>
          <Link href="/">ReviewSite<span className={styles.dot}>.</span><span className={styles.accent}>DESIGN</span></Link>
        </div>
      </div>
      
      <div className={styles.centerSection}>
        <div className={`${styles.searchContainer} ${isSearchOpen ? styles.open : ""}`}>
          <form 
            onSubmit={handleSearch} 
            className={styles.searchForm}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setIsSearchOpen(false);
              }
            }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="게시물 검색..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <button className={styles.searchBtn} type="button" onClick={handleToggle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.rightSection}>
        <button className={styles.iconBtn}>📄</button>
        <button className={styles.iconBtn}>🔔</button>
        <div className={styles.profile}>
          <div className={styles.avatar}>👦</div>
        </div>
      </div>
    </header>
  );
}
