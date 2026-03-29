"use client";

import { useState, useRef, useEffect, useTransition } from "react";
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
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
    
    if (confirm("濡쒓렇?꾩썐 ?섏떆寃좎뒿?덇퉴?")) {
      startTransition(async () => {
        try {
          await logout();
        } catch (err) {
          console.error("Logout error:", err);
        }
        // ?뺤떎???곹깭 諛섏쁺???꾪빐 硫붿씤?쇰줈 媛뺤젣 ?대룞?섎ŉ ?섏씠吏 ?덈줈怨좎묠
        window.location.href = "/";
      });
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.navContent}>
        {/* Left: Hamburger + Logo */}
        <div className={styles.leftGroup}>
          <button className={styles.hamburgerBtn} onClick={onMobileToggle}>??/button>
          <Link href="/" className={styles.logoText}>
            <span className={styles.logoSub}>WoogaWooga</span>
          </Link>
        </div>

        {/* Right: Search + Icons + Auth */}
        <div className={styles.rightGroup}>
          <form onSubmit={handleSearch} className={styles.searchBar}>
            <input
              type="text"
              placeholder="寃뚯떆臾?寃??.."
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

          <div className={styles.iconGroup}>
            <button className={styles.iconBtn}>?뱞</button>
            <button className={styles.iconBtn}>?뵒</button>
          </div>

          <div className={styles.authWrapper}>
            {user ? (
              <div className={styles.authInfo}>
                {(role === 'admin' || role === 'editor') && (
                  <Link href="/write" className={styles.writeButton}>?랃툘 ?곌린</Link>
                )}
                <div className={styles.dropdownContainer} ref={dropdownRef}>
                  <button 
                    className={styles.avatarBtn} 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    aria-label="Profile and settings"
                    disabled={isPending}
                  >
                    <div className={styles.userAvatar}>
                      {isPending ? "..." : (user.email?.charAt(0).toUpperCase() || "?뫂")}
                    </div>
                  </button>
                  
                  {isProfileMenuOpen && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.menuHeader}>
                        <span className={styles.userEmail}>{user.email}</span>
                        <span className={styles.userRole}>{role}</span>
                      </div>
                      <Link href="/settings" className={styles.menuItem} onClick={() => setIsProfileMenuOpen(false)}>
                        ?숋툘 ?ㅼ젙 諛??꾨줈???섏젙
                      </Link>
                      <form onSubmit={handleLogout}>
                        <button 
                          type="submit" 
                          className={styles.menuItemLogout} 
                          disabled={isPending}
                        >
                          {isPending ? "??濡쒓렇?꾩썐 以?.." : "?몝 濡쒓렇?꾩썐"}
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
