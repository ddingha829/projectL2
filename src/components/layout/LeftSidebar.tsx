"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./LeftSidebar.module.css";
import { AUTHORS } from "@/lib/constants/authors";
import { createClient } from "@/lib/supabase/client";
import { useTransition } from "react";
import { logout } from "@/app/login/actions";

import { CATEGORY_LIST } from "@/lib/constants/categories";

const CATEGORIES = [
  { id: "all", name: "전체 글 보기" },
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
  const [isPending, startTransition] = useTransition();

  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      startTransition(async () => {
        try {
          await logout();
        } catch (err) {
          console.error("Logout error:", err);
        }
      });
    }
  };

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
              bullets: p.bullets || ["신규 작가"]
            }
          }));
        setLiveAuthors(mapped);
      }
    };

    fetchLiveAuthors();

    // Fetch notices
    const fetchNotices = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, created_at')
        .eq('category', 'notice')
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
                <div className={styles.nameGroup}>
                  <span className={styles.mobileNickname}>{displayName || user.email?.split('@')[0]}</span>
                  <span className={styles.mobileRole}>
                    {role === 'admin' ? '운영자' : role === 'editor' ? '티끌러' : '방문객'}
                  </span>
                </div>
                <div className={styles.mobileActionButtons}>
                  {role === 'admin' && (
                    <Link href="/admin" className={styles.mobileAdminBtn} onClick={onClose}>
                      ⚙️ 관리
                    </Link>
                  )}
                  {(role === 'admin' || role === 'editor') && (
                    <Link href="/write" className={styles.mobileWriteBtn} onClick={onClose}>
                      ✍️ 글쓰기
                    </Link>
                  )}
                </div>
              </div>
              <div className={styles.mobileUserLinks}>
                <Link href="/notice" className={styles.mobileLink} onClick={onClose}>알림 설정</Link>
                <Link href="/settings" className={styles.mobileLink} onClick={onClose}>설정 및 프로필 수정</Link>
                <button 
                  className={styles.mobileLogoutBtn} 
                  onClick={handleLogout}
                  disabled={isPending}
                >
                  {isPending ? "로그아웃 중..." : "로그아웃"}
                </button>
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

        {/* New Mobile-Optimized Navigation Menu */}
        <div className={styles.sidebarNav}>
          <Link href="/magazine" className={styles.sidebarLink} style={{ fontWeight: '800', color: '#ff4d00' }} onClick={onClose}>
            매거진
          </Link>
          <details className={styles.sidebarDisclosure}>
            <summary className={styles.sidebarSummary}>
              <Link href="/?view=all" className={styles.summaryLink} onClick={onClose}>
                티끌 모음
              </Link>
              <span className={styles.disclosureArrow}>▼</span>
            </summary>
            <div className={styles.disclosureContent}>
              {CATEGORY_LIST.map(cat => (
                <Link 
                  key={cat.id} 
                  href={`/?category=${cat.id}`} 
                  className={styles.disclosureLink}
                  onClick={onClose}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </details>

          <details className={styles.sidebarDisclosure}>
            <summary 
              className={styles.sidebarSummary}
              onClick={(e) => {
                // 화살표 클릭이 아닌 텍스트 영역 클릭 시 스크롤 시도할 수 있도록 함
                if ((e.target as HTMLElement).tagName !== 'SUMMARY') return;
              }}
            >
              <span 
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.preventDefault();
                  if (window.location.pathname === '/') {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                  } else {
                    router.push('/?scrollTo=bottom');
                  }
                  if (onClose) onClose();
                }}
              >
                티끌러
              </span>
              <span className={styles.disclosureArrow}>▼</span>
            </summary>
            <div className={styles.disclosureContent}>
              {ALL_AUTHORS.map(editor => (
                <Link 
                  key={editor.id} 
                  href={`/?author=${encodeURIComponent(editor.name || editor.id)}`} 
                  className={styles.disclosureLink}
                  onClick={onClose}
                >
                  <img src={editor.avatar} alt={editor.name} className={styles.editorTinyAvatar} />
                  {editor.name}
                </Link>
              ))}
            </div>
          </details>

          <details className={styles.sidebarDisclosure}>
            <summary className={styles.sidebarSummary}>
              <span style={{ cursor: 'pointer', color: '#ff4d00', fontWeight: 'bold' }}>
                컬렉션
              </span>
              <span className={styles.disclosureArrow}>▼</span>
            </summary>
            <div className={styles.disclosureContent}>
              <Link href="/reviews" className={styles.disclosureLink} onClick={onClose}>
                플레이스
              </Link>
              <Link href="/library" className={styles.disclosureLink} onClick={onClose}>
                라이브러리
              </Link>
              <Link href="/gallery" className={styles.disclosureLink} onClick={onClose}>
                갤러리
              </Link>
            </div>
          </details>
        </div>


        <div className={styles.copyright}>
          <p>Copyright 2026. Team L2.<br />All rights reserved.</p>
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
