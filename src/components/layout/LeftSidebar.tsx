"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./LeftSidebar.module.css";
import { AUTHORS } from "@/lib/constants/authors";
import { MOCK_NOTICE } from "@/lib/constants/notice";
import HeroCard from "@/components/feed/HeroCard";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  { id: "all", name: "모든 글", icon: "🏠" },
  { id: "movie", name: "영화", icon: "🎬" },
  { id: "book", name: "책", icon: "📚" },
  { id: "game", name: "게임", icon: "🎮" },
  { id: "restaurant", name: "맛집", icon: "🍱" },
  { id: "travel", name: "여행", icon: "✈️" },
  { id: "exhibition", name: "전시회", icon: "🖼️" },
  { id: "other", name: "기타", icon: "✨" },
];

interface LeftSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function LeftSidebar({ isOpen, onClose }: LeftSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category");
  const currentAuthor = searchParams.get("author");
  const currentView = searchParams.get("view");

  const [hoveredAuthor, setHoveredAuthor] = useState<any>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [liveAuthors, setLiveAuthors] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("user");

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
    
    // Fetch live writers from DB
    const fetchLiveAuthors = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or('role.eq.writer,role.eq.admin');
      
      if (data && !error) {
        const mapped = data.map(p => ({
          id: p.id,
          name: p.display_name || "익명 작가",
          avatar: p.avatar_url || "👤",
          color: "#0a467d",
          description: {
            bio: p.bio || "활동 중인 작가입니다.",
            bullets: p.description_bullets || ["신규 작가"]
          }
        }));
        setLiveAuthors(mapped);
      }
    };

    fetchLiveAuthors();

    // Fetch auth state
    const supabase = createClient();
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

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const ALL_AUTHORS = [...AUTHORS, ...liveAuthors];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("search", searchQuery);
      router.push(`/?${params.toString()}`);
      if (onClose) onClose();
      setSearchQuery("");
    }
  };

  const handleAuthorEnter = (author: any, e: React.MouseEvent) => {
    if (window.innerWidth <= 768) return; // Skip tooltips on mobile
    const rect = e.currentTarget.getBoundingClientRect();
    // Position bubble to the right of the sidebar boundary
    setCoords({ top: rect.top, left: 280 + 16 }); 
    setHoveredAuthor(author);
  };

  const handleAuthorLeave = () => {
    setHoveredAuthor(null);
  };

  const handleFilter = (type: "category" | "author", value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === "all") {
      params.delete("category");
      params.delete("author");
      params.set("view", "all");
    } else {
      params.delete("view");
      if (value === null) {
        params.delete(type);
      } else if (params.get(type) === value) {
        params.delete(type);
      } else {
        params.set(type, value);
      }
    }
    
    router.push(`/?${params.toString()}`);
    if (onClose) onClose();
  };

  return (
    <>
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
        {/* Mobile Header: Title + Close Button */}
        <div className={styles.mobileHeader}>
          <h2 className={styles.sidebarBrand}>Menu</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Mobile Only: Icons at top */}
        <div className={styles.mobileActions}>
          <form className={styles.mobileSearch} onSubmit={handleSearch}>
            <input 
              type="text" 
              placeholder="검색..." 
              className={styles.mobileInput} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className={styles.mobileSearchBtn}>🔍</button>
          </form>
          <div className={styles.actionRow}>
            <button className={styles.iconBtn}>📄</button>
            <button className={styles.iconBtn}>🔔</button>
            {user ? (
              <Link href="/settings" className={styles.userProfileBtn} onClick={onClose}>
                <div className={styles.mobileAvatar}>
                  {user.email?.charAt(0).toUpperCase() || "👤"}
                </div>
              </Link>
            ) : (
              <Link href="/login" className={styles.loginBtnSmall} onClick={onClose}>로그인</Link>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <header className={styles.sidebarHeader}>
            <h3 className={styles.sectionTitle}>Notice</h3>
            <div className={styles.sidebarDivider}></div>
          </header>
          <div className={styles.noticeContainer}>
            <HeroCard {...MOCK_NOTICE} heightRatio="compact" />
          </div>
        </div>

        <div className={styles.section}>
          <header className={styles.sidebarHeader}>
            <h3 className={styles.sectionTitle}>Categories</h3>
            <div className={styles.sidebarDivider}></div>
          </header>
          <ul className={styles.categoryGrid}>
            <li className={styles.fullRow}>
              <button 
                onClick={() => handleFilter("category", "all")}
                className={`${styles.menuBtn} ${currentView === "all" ? styles.active : ""}`}
              >
                <span className={styles.icon}>{CATEGORIES[0].icon}</span>
                <span className={styles.name}>{CATEGORIES[0].name}</span>
              </button>
            </li>
            {CATEGORIES.slice(1).map((cat) => (
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
          <header className={styles.sidebarHeader}>
            <h3 className={styles.sectionTitle}>Writers</h3>
            <div className={styles.sidebarDivider}></div>
          </header>
          <ul className={styles.menuList}>
            {ALL_AUTHORS.map((author) => (
              <li 
                key={author.id} 
                className={styles.userContainer}
                onMouseEnter={(e) => handleAuthorEnter(author, e)}
                onMouseLeave={handleAuthorLeave}
              >
                <button 
                  onClick={() => handleFilter("author", author.id)}
                  className={`${styles.userBtn} ${currentAuthor === author.id ? styles.active : ""}`}
                >
                  <div className={styles.userInfo}>
                    {author.avatar.startsWith("/") || author.avatar.startsWith("http") ? (
                      <img src={author.avatar} alt={author.name} className={styles.avatarImg} />
                    ) : (
                      <span className={styles.avatarEmoji}>{author.avatar}</span>
                    )}
                    <span className={styles.authorName}>{author.name}</span>
                  </div>
                  <div className={styles.colorLine} style={{ backgroundColor: author.color }}></div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {mounted && hoveredAuthor && createPortal(
        <div 
          className={styles.authorTooltip}
          style={{ 
            top: `${coords.top}px`, 
            left: `${coords.left}px`, 
            opacity: 1, 
            visibility: 'visible',
            '--author-color': hoveredAuthor.color
          } as React.CSSProperties}
        >
          <h4 className={styles.tooltipBio}>{hoveredAuthor.description.bio}</h4>
          <ul className={styles.tooltipBullets}>
            {hoveredAuthor.description.bullets.map((bullet: string, idx: number) => (
              <li key={idx}>{bullet}</li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}
