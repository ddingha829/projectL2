"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/login/actions";
import styles from "./TopNavbar.module.css";

export default function TopNavbar({ onMobileToggle }: { onMobileToggle?: () => void }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("user");

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        supabase.from('profiles').select('role').eq('id', data.user.id).single()
          .then(({ data: profile }) => {
            if (profile) setRole(profile.role);
          });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setRole("user");
      else {
        supabase.from('profiles').select('role').eq('id', session.user.id).single()
          .then(({ data: profile }) => setRole(profile?.role || "user"));
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [supabase]);

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
        <div className={styles.mobileLogo}>
          <Link href="/">
            <picture>
              <source srcSet="/logo2.png" media="(prefers-color-scheme: dark)" />
              <img src="/logo.png" alt="WoogaWooga Logo" style={{ height: '28px', width: 'auto' }} />
            </picture>
          </Link>
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
          {user ? (
            <div className={styles.authContainer}>
              {role === 'admin' && (
                <Link href="/write" className={styles.writeBtn}>✍️ 글쓰기</Link>
              )}
              <div className={styles.avatar}>{user.email?.charAt(0).toUpperCase() || "👦"}</div>
              <form action={logout}>
                <button type="submit" className={styles.logoutBtn}>Logout</button>
              </form>
            </div>
          ) : (
            <Link href="/login" className={styles.loginLink}>Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
