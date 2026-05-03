"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/login/actions";
import NotificationSystem from "./NotificationSystem";
import { CATEGORY_LIST } from "@/lib/constants/categories";
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
  const [isEditorsOpen, setIsEditorsOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [editors, setEditors] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editorsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const supabaseClient = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchEditors = async () => {
      const { data } = await supabaseClient
        .from('profiles')
        .select('id, display_name, role')
        .in('role', ['admin', 'editor'])
        .order('display_name');
      if (data) setEditors(data);
    };
    fetchEditors();
  }, []);

  // [개선] 기기 및 선호도 체크 (리다이렉트 제거)
  useEffect(() => {
    const isMob = window.innerWidth <= 768;
    setIsMobile(isMob);
    
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        window.location.href = "/";
      });
    }
  };

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.navContent}>
        {isMobile && (
          <button className={styles.hamburgerBtn} onClick={onMobileToggle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}

        <div className={styles.leftGroup}>
          <Link href="/" className={styles.logoLink}>
            <img src="/logo.png?v=1301" alt="티끌 Ticgle" className={styles.logoImage} />
          </Link>
        </div>

        {isMobile && user && (
          <div className={styles.mobileNotifWrap}>
            <NotificationSystem user={user} />
          </div>
        )}

        <nav className={styles.mainNav}>
          <Link href="/magazine" className={styles.navLink} style={{ fontWeight: '800' }}>매거진</Link>
          <div 
            className={styles.dropdownContainer}
            onMouseEnter={() => setIsCategoryOpen(true)}
            onMouseLeave={() => setIsCategoryOpen(false)}
          >
            <Link href="/?view=all" className={styles.navLink}>
              티끌 모음 <span className={styles.miniArrow}>▼</span>
            </Link>
            {isCategoryOpen && (
              <div className={styles.navDropdown}>
                {CATEGORY_LIST.map(cat => (
                  <Link 
                    key={cat.id} 
                    href={`/?category=${cat.id}`} 
                    className={styles.dropdownItem}
                    onClick={() => setIsCategoryOpen(false)}
                  >
                    <span className={styles.edName}>{cat.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div 
            className={styles.dropdownContainer}
            onMouseEnter={() => setIsEditorsOpen(true)}
            onMouseLeave={() => setIsEditorsOpen(false)}
          >
            <span 
              className={styles.navLink} 
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (window.location.pathname === '/') {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                } else {
                  router.push('/?scrollTo=bottom');
                }
              }}
            >
              티끌러 <span className={styles.miniArrow}>▼</span>
            </span>
            {isEditorsOpen && (
              <div className={styles.navDropdown}>
                {editors.map(ed => (
                  <Link 
                    key={ed.id} 
                    href={`/?author=${encodeURIComponent(ed.display_name || ed.id)}`} 
                    className={styles.dropdownItem}
                    onClick={() => setIsEditorsOpen(false)}
                  >
                    <span className={styles.edName}>{ed.display_name}</span>
                    <span className={styles.edRole}>{ed.role === 'admin' ? '운영자' : '티끌러'}</span>
                  </Link>
                ))}
                {editors.length === 0 && <div className={styles.emptyEds}>티끌러가 없습니다.</div>}
              </div>
            )}
          </div>

          <Link href="/reviews" className={styles.navLink} style={{ color: '#ff4d00', fontWeight: 'bold' }}>플레이스</Link>
          <Link href="/gallery" className={styles.navLink} style={{ color: '#ff4d00', fontWeight: 'bold' }}>갤러리</Link>
        </nav>

        <div className={styles.rightGroup}>
          <form 
            onSubmit={handleSearch} 
            className={`${styles.searchBar} ${isSearchExpanded ? styles.searchBarExpanded : ''}`}
          >
            <input
              type="text"
              placeholder="검색..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              ref={(input) => { if (isSearchExpanded) input?.focus(); }}
              suppressHydrationWarning
            />
            <button 
              type="button" 
              className={styles.searchBtn} 
              onClick={() => {
                if (isSearchExpanded && searchQuery.trim()) {
                  const form = document.querySelector(`.${styles.searchBar}`) as HTMLFormElement;
                  form?.requestSubmit();
                } else {
                  setIsSearchExpanded(!isSearchExpanded);
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </form>

          {isSearchExpanded && !isMobile && (
            <div className={styles.trendingKeywords}>
              <span className={styles.trendingLabel}>지금 많이 찾는 리뷰:</span>
              <div className={styles.keywordList}>
                {['오사카여행', '범퍼침대', '독서후기', '맛집추천', '주말전시'].map(tag => (
                  <button 
                    key={tag} 
                    className={styles.keywordTag}
                    onClick={() => {
                      router.push(`/?search=${encodeURIComponent(tag)}`);
                      setIsSearchExpanded(false);
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isMobile && <NotificationSystem user={user} />}

          <div className={styles.authWrapper}>
            {user ? (
              <div className={styles.authInfo}>
                {(role === 'admin' || role === 'editor') && (
                  <div className={styles.navActions}>
                    <Link href="/write" className={styles.writeButton}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                      </svg>
                      글쓰기
                    </Link>
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
                        {role === 'admin' ? '운영자' : role === 'editor' ? '티끌러' : '방문객'}
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
