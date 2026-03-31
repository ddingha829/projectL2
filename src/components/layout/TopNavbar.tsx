"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/login/actions";
import styles from "./TopNavbar.module.css";

export default function TopNavbar({ 
  onMobileToggle, 
  user, 
  role, 
  displayName 
}: { 
  onMobileToggle?: () => void;
  user: any;
  role: string;
  displayName: string;
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setIsProfileMenuOpen(false);
    }
  };

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    
    if (confirm("로그아웃 하시겠습니까?")) {
      startTransition(async () => {
        try {
          await logout();
        } catch (err) {
          console.error("Logout error:", err);
        }
        // 확실한 상태 반영을 위해 메인으로 강제 이동하며 페이지 새로고침
        window.location.href = "/";
      });
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.navContent}>
        {/* Left: Hamburger + Logo */}
        <div className={styles.leftGroup}>
          <button className={styles.hamburgerBtn} onClick={onMobileToggle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <Link href="/" className={styles.logoText}>
            <span className={styles.logoSub}>WoogaWooga</span>
          </Link>
        </div>

        {/* Right: Search + Icons + Auth */}
        <div className={styles.rightGroup}>
          <form onSubmit={handleSearch} className={styles.searchBar}>
            <input
              type="text"
              placeholder="게시물 검색..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className={styles.searchBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </form>


          <div className={styles.authWrapper}>
            {user ? (
              <div className={styles.authInfo}>
                {(role === 'admin' || role === 'editor') && (
                  <div className={styles.navActions}>
                    {role === 'admin' && (
                      <Link href="/admin" className={styles.adminButton}>⚙️ 관리</Link>
                    )}
                    <Link href="/write" className={styles.writeButton}>✍️ 쓰기</Link>
                  </div>
                )}
                <div className={styles.dropdownContainer} ref={dropdownRef}>
                  <button 
                    className={styles.avatarBtn} 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    aria-label="Profile and settings"
                    disabled={isPending}
                  >
                    <div className={styles.userNameDisplay}>
                      {isPending ? "..." : (displayName || user.email?.split('@')[0] || "사용자")}
                      <span className={styles.roleLabel}>
                        {role === 'admin' ? '운영자' : role === 'editor' ? '에디터' : '방문객'}
                      </span>
                      <span className={styles.dropdownArrow}>▼</span>
                    </div>
                  </button>
                  
                  {isProfileMenuOpen && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.menuHeader}>
                        <span className={styles.menuUserName}>{displayName || "사용자"}</span>
                        <span className={styles.menuUserEmail}>{user.email}</span>
                        <div className={styles.roleBadge}>{role}</div>
                      </div>
                      <Link href="/settings" className={styles.menuItem} onClick={() => setIsProfileMenuOpen(false)}>
                        설정 및 프로필 수정
                      </Link>
                      {(role === 'admin' || role === 'editor') && (
                        <button className={styles.menuItem} onClick={() => { alert('알림 설정 페이지는 준비 중입니다.'); setIsProfileMenuOpen(false); }}>
                          알림 설정
                        </button>
                      )}
                      {role === 'admin' && (
                        <Link href="/admin" className={styles.menuItem} onClick={() => setIsProfileMenuOpen(false)}>
                          관리자 대시보드
                        </Link>
                      )}
                      <form onSubmit={handleLogout}>
                        <button 
                          type="submit" 
                          className={styles.menuItemLogout} 
                          disabled={isPending}
                        >
                          {isPending ? "⏳ 로그아웃 중..." : "👋 로그아웃"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Link href="/login" className={styles.loginButton}>Login</Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
