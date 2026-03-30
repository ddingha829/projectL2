"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./LeftSidebar.module.css";
import { AUTHORS } from "@/lib/constants/authors";
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
  user: any;
  role: string;
  displayName: string;
}

export default function LeftSidebar({ isOpen, onClose, user, role, displayName }: LeftSidebarProps) {
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
  const [notices, setNotices] = useState<any[]>([]);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
    
    // Fetch live writers from DB
    const fetchLiveAuthors = async () => {
      // Fetch distinct authors who have at least one post
      const { data, error } = await supabase
        .from('posts')
        .select('author:profiles!author_id(*)')
        .not('author_id', 'is', null);
      
      if (data && !error) {
        // Filter unique authors and those with appropriate roles
        const uniqueAuthorIds = new Set();
        const mapped = data
          .map((p: any) => p.author)
          .filter((p: any) => {
            if (!p || uniqueAuthorIds.has(p.id)) return false;
            const hasRole = ['admin', 'editor', 'writer'].includes(p.role);
            if (hasRole) {
              uniqueAuthorIds.add(p.id);
              return true;
            }
            return false;
          })
          .map((p: any) => ({
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

    // Fetch notices
    const fetchNotices = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (data && !error) {
        setNotices(data);
      }
    };
    fetchNotices();
  }, [supabase]);

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
        {/* Mobile Only: Icons to the left of Search */}
        <div className={styles.mobileActions}>
          {user ? (
            <div className={styles.mobileUserInfo}>
              <div className={styles.mobileUserHeader}>
                <div className={styles.nameAndWrite}>
                  <span className={styles.mobileNickname}>{displayName || user.email?.split('@')[0]}</span>
                  {(role === 'admin' || role === 'editor') && (
                    <Link href="/write" className={styles.mobileWriteBtn} onClick={onClose}>
                      ✍️ 글쓰기
                    </Link>
                  )}
                </div>
                <span className={styles.mobileRole}>
                  [{role === 'admin' ? '운영자' : role === 'editor' ? '에디터' : '방문객'}]
                </span>
              </div>
              <div className={styles.mobileUserLinks}>
                <Link href="/notice" className={styles.mobileLink} onClick={onClose}>알림 설정</Link>
                <Link href="/settings" className={styles.mobileLink} onClick={onClose}>설정 및 프로필 수정</Link>
              </div>
            </div>
          ) : (
            <div className={styles.actionRow}>
              <Link href="/login" className={styles.loginBtnSmall} onClick={onClose}>로그인</Link>
            </div>
          )}
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
        </div>

        <div className={styles.section}>
          <header className={`${styles.sidebarHeader} ${styles.noticeHeader}`}>
            <Link href="/notice" className={styles.sectionTitleLink}>
              <h3 className={styles.sectionTitle}>Notice</h3>
            </Link>
            <div className={styles.sidebarDivider}></div>
          </header>
          <div className={styles.noticeList}>
            {notices.length > 0 ? (
              notices.map((n) => (
                <Link key={n.id} href={`/post/db-${n.id}`} className={styles.noticeItem}>
                  <span className={styles.noticeDot}>•</span>
                  <span className={styles.noticeTitle}>{n.title}</span>
                </Link>
              ))
            ) : (
              [1, 2, 3].map((i) => (
                <div key={i} className={styles.noticePlaceholder}>
                  <span className={styles.placeholderDot}>•</span>
                  <span className={styles.placeholderText}>공지사항이 없습니다.</span>
                </div>
              ))
            )}
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
            <h3 className={styles.sectionTitle}>Editors</h3>
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

        <div className={styles.copyright}>
          <p>Copyright 2026. Project L2.<br />All rights reserved.</p>
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
