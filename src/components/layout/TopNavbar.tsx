"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  const [isEditorsOpen, setIsEditorsOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [editors, setEditors] = useState<any[]>([]);
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

  const ViewSettingsDropdown = ({ isPC = false }: { isPC?: boolean }) => {
    const vType = searchParams.get("viewType") || "card";
    const mCols = searchParams.get("mCols") || "2";
    const dCols = searchParams.get("dCols") || "4";
    const [isOpen, setIsOpen] = useState(false);
    const viewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (viewRef.current && !viewRef.current.contains(e.target as Node)) setIsOpen(false);
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const updateParam = (key: string, val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, val);
      router.replace(`?${params.toString()}`, { scroll: false });
      setIsOpen(false);
    };

    return (
      <div className={styles.vDropdownWrap} ref={viewRef}>
        <button 
          className={`${styles.vBtn} ${isOpen ? styles.vBtnActive : ''}`} 
          onClick={() => setIsOpen(!isOpen)} 
          aria-label="필터 및 보기 설정"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
        </button>
        {isOpen && (
          <div className={`${styles.vMenu} ${styles.vMenuRight} ${!isPC ? styles.vMobileMenu : ''}`}>
            <div className={styles.vMenuHeader}>
              <span className={styles.vMenuTitle}>디스플레이 설정</span>
              <button className={styles.vCloseSmall} onClick={() => setIsOpen(false)}>✕</button>
            </div>
            <div className={styles.vGroup}>
              <span className={styles.vLabel}>레이아웃 모드</span>
              <div className={styles.vOptionsGrid}>
                <button 
                  className={`${styles.vCardOpt} ${vType === 'card' ? styles.vActive : ''}`}
                  onClick={() => updateParam("viewType", "card")}
                >
                  <div className={styles.vOptIcon}>🏙️</div>
                  <div className={styles.vOptLabel}>그리드</div>
                </button>
                <button 
                  className={`${styles.vCardOpt} ${vType === 'magazine' ? styles.vActive : ''}`}
                  onClick={() => updateParam("viewType", "magazine")}
                >
                  <div className={styles.vOptIcon}>📰</div>
                  <div className={styles.vOptLabel}>매거진</div>
                </button>
              </div>
            </div>
            {vType === 'card' && (
              <div className={styles.vGroup}>
                <span className={styles.vLabel}>{isPC ? '데스크탑' : '모바일'} 컬럼 수</span>
                <div className={styles.vColSelector}>
                  {(isPC ? ['2', '3', '4'] : ['1', '2', '3']).map(n => (
                    <button 
                      key={n}
                      className={`${styles.vColBtn} ${ (isPC ? dCols : mCols) === n ? styles.vColActive : ''}`}
                      onClick={() => updateParam(isPC ? "dCols" : "mCols", n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <header className={styles.header}>
      <div className={styles.navContent}>
        {/* Left: Hamburger + Logo + Mobile View Settings */}
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

          {/* Mobile Only: View Settings Button */}
          <div className={styles.mobileViewToggleWrap}>
            <ViewSettingsDropdown />
          </div>
        </div>

        <nav className={styles.mainNav}>
          <Link href="/?view=all" className={styles.navLink}>전체 포스팅</Link>
          
          <div 
            className={styles.dropdownContainer}
            onMouseEnter={() => setIsCategoryOpen(true)}
            onMouseLeave={() => setIsCategoryOpen(false)}
          >
            <span className={styles.navLink}>
              카테고리 <span className={styles.miniArrow}>▼</span>
            </span>
            {isCategoryOpen && (
              <div className={styles.navDropdown}>
                {[
                  { id: 'restaurant', name: '맛집' },
                  { id: 'travel', name: '여행' },
                  { id: 'movie', name: '영화' },
                  { id: 'game', name: '게임' },
                  { id: 'book', name: '책' },
                  { id: 'exhibition', name: '전시회' },
                  { id: 'other', name: '기타' }
                ].map(cat => (
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
            <span className={styles.navLink}>
              에디터 <span className={styles.miniArrow}>▼</span>
            </span>
            {isEditorsOpen && (
              <div className={styles.navDropdown}>
                {editors.map(ed => (
                  <Link 
                    key={ed.id} 
                    href={`/?author=${ed.id}`} 
                    className={styles.dropdownItem}
                    onClick={() => setIsEditorsOpen(false)}
                  >
                    <span className={styles.edName}>{ed.display_name}</span>
                    <span className={styles.edRole}>{ed.role === 'admin' ? '운영자' : '에디터'}</span>
                  </Link>
                ))}
                {editors.length === 0 && <div className={styles.emptyEds}>에디터가 없습니다.</div>}
              </div>
            )}
          </div>
        </nav>

        {/* Right: Search + Icons + Auth + View Settings */}
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

          {/* PC Only View Settings */}
          <div className={styles.pcViewToggleWrap}>
            <ViewSettingsDropdown isPC={true} />
          </div>
        </div>
      </div>
    </header>
  );
}
