"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FrozenRoute } from "@/components/common/FrozenRoute";
import TopNavbar from "./TopNavbar";
import LeftSidebar from "./LeftSidebar";
import gridStyles from "@/app/layout.module.css";
import Footer from "./Footer";

// --- Caveman Easter Egg Component ---
function CavemanStickman() {
  const [entities, setEntities] = useState<{ id: number; top: number; speed: number; delay: number; type: 'stickman' | 'mammoth' }[]>([]);
  
  useEffect(() => {
    // Generate entities (10% mammoths)
    const newEntities = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      // 10% mammoths
      type: (i === 0) ? 'mammoth' as const : 'stickman' as const,
      top: Math.random() * 80 + 10,
      // Stickmen slightly faster to "chase"
      speed: (i === 0) ? 22 + Math.random() * 5 : 18 + Math.random() * 5, 
      delay: Math.random() * 25
    }));
    setEntities(newEntities);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'hidden', opacity: 0.25 }}>

      <style>{`
        @keyframes entityRun {
          from { transform: translateX(-150px) rotate(0deg); }
          25% { transform: translateX(25vw) rotate(10deg); }
          50% { transform: translateX(50vw) rotate(-10deg); }
          75% { transform: translateX(75vw) rotate(10deg); }
          to { transform: translateX(115vw) rotate(0deg); }
        }
        @keyframes entityRunMammoth {
          from { transform: translateX(-50px) rotate(0deg); }
          25% { transform: translateX(25vw) rotate(2deg); }
          50% { transform: translateX(50vw) rotate(-2deg); }
          75% { transform: translateX(75vw) rotate(2deg); }
          to { transform: translateX(115vw) rotate(0deg); }
        }
        @keyframes runWobble {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      {entities.map((e) => (
        <div 
          key={e.id}
          style={{
            position: 'absolute',
            top: `${e.top}%`,
            left: '-150px',
            animation: `${e.type === 'mammoth' ? 'entityRunMammoth' : 'entityRun'} ${e.speed}s linear ${e.delay}s infinite`,
          }}
        >
          <div style={{ animation: 'runWobble 0.4s ease-in-out infinite' }}>
            {e.type === 'mammoth' ? (
              <svg width="100" height="100" viewBox="0 0 100 100">
                {/* Mammoth Body */}
                <ellipse cx="55" cy="55" rx="35" ry="25" fill="#5d4037" />
                <circle cx="30" cy="45" r="18" fill="#5d4037" />
                {/* Trunk */}
                <path d="M15 45 Q 5 45 5 65" stroke="#5d4037" strokeWidth="6" fill="none" />
                {/* Tusk */}
                <path d="M18 52 Q 8 52 6 35" stroke="#f5f5f5" strokeWidth="3" fill="none" />
                {/* Ears */}
                <ellipse cx="40" cy="40" rx="8" ry="12" fill="#4e342e" />
                {/* Eye */}
                <circle cx="25" cy="42" r="2" fill="black" />
                {/* Legs */}
                <rect x="40" y="75" width="12" height="15" fill="#5d4037" />
                <rect x="65" y="75" width="12" height="15" fill="#5d4037" />
                {/* Tail */}
                <path d="M90 55 Q 98 60 95 70" stroke="#5d4037" strokeWidth="2" fill="none" />
              </svg>
            ) : (
              <svg width="60" height="60" viewBox="0 0 100 100">
                {/* Stickman Body */}
                <circle cx="40" cy="25" r="8" fill="currentColor" />
                <line x1="40" y1="33" x2="40" y2="65" stroke="currentColor" strokeWidth="4" />
                <line x1="40" y1="40" x2="60" y2="45" stroke="currentColor" strokeWidth="4" /> {/* Spear Arm */}
                <line x1="40" y1="40" x2="25" y2="55" stroke="currentColor" strokeWidth="4" />
                <line x1="40" y1="65" x2="25" y2="85" stroke="currentColor" strokeWidth="4" />
                <line x1="40" y1="65" x2="55" y2="85" stroke="currentColor" strokeWidth="4" />
                {/* Long Spear */}
                <line x1="60" y1="45" x2="85" y2="15" stroke="#5d4037" strokeWidth="3" />
                <path d="M82 18 L90 10 L85 22 Z" fill="#757575" />
              </svg>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams.toString()}`;
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [isCavemanEnabled, setIsCavemanEnabled] = useState(false);
  const lastUserId = useRef<string | null>(null);
  const router = useRouter();


  // Unified Auth State
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("user");
  const [displayName, setDisplayName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const checkSize = () => setIsMobileScreen(window.innerWidth <= 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
    } else {
      document.body.style.overflow = "unset";
      document.body.style.overscrollBehavior = "unset";
    }
  }, [isMobileOpen]);

  // Force scroll to top on navigation change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, searchParams]);

  // Optimized Sync Logic (Bypass DB lag with metadata)
  useEffect(() => {
    const syncAuth = async (currUser: any) => {
      if (!currUser) {
        setUser(null);
        setRole("user");
        setDisplayName("");
        setIsLoading(false);
        return;
      }

      setUser(currUser);
      
      // STEP 1: Immediate metadata fallback (Prevents visitor downgrade if DB is slow)
      const metaRole = currUser.app_metadata?.role || currUser.user_metadata?.role || "user";
      const metaName = currUser.user_metadata?.full_name || currUser.user_metadata?.display_name || "";
      
      setRole(metaRole);
      setDisplayName(metaName);
      setIsLoading(false); 

      // STEP 2: Background profile fetch
      try {
        const { data: profile } = await supabase.from('profiles').select('role, display_name').eq('id', currUser.id).single();
        if (profile) {
          if (profile.role) setRole(profile.role);
          if (profile.display_name) setDisplayName(profile.display_name);
        }
      } catch (err) {
        console.warn("DB profile sync skipped", err);
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        lastUserId.current = data.user.id;
        syncAuth(data.user);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUserId = session?.user?.id || null;
      
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        syncAuth(session?.user);
        
        // Only refresh if user status actually changed (prevents infinite loops)
        if (currentUserId !== lastUserId.current) {
          lastUserId.current = currentUserId;
          router.refresh();
        }
      } else if (event === 'SIGNED_OUT') {
        syncAuth(null);
        if (lastUserId.current !== null) {
          lastUserId.current = null;
          router.push('/');
          router.refresh();
        }
      } else if (event === 'USER_UPDATED') {
        syncAuth(session?.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Record Global Visit
  useEffect(() => {
    const recordVisit = async () => {
      // Use a consistent key for visit tracking
      const VISIT_KEY = 'project_l2_visited';
      const hasVisited = sessionStorage.getItem(VISIT_KEY);
      
      if (!hasVisited) {
        try {
          // Record the visit in Supabase
          const { error } = await supabase.from('site_visits').insert({});
          if (error) {
             console.warn("Visitor recording failed:", error.message);
          } else {
             sessionStorage.setItem(VISIT_KEY, 'true');
          }
        } catch (err) {
          console.error("Critical error recording visit:", err);
        }
      }
    };
    recordVisit();
  }, [supabase]);

  return (
    <>
      {!isMobileScreen && isCavemanEnabled && <CavemanStickman />}

      <TopNavbar 
        key={`navbar-${user?.id || 'guest'}-${isLoading}`}
        onMobileToggle={() => setIsMobileOpen(!isMobileOpen)} 
        user={user}
        role={role}
        displayName={displayName}
      />
      <div className={gridStyles.mainContainer}>
        <LeftSidebar 
          isOpen={isMobileOpen} 
          onClose={() => setIsMobileOpen(false)} 
          user={user}
          role={role}
          displayName={displayName}
        />
        {isMobileOpen && (
          <div className={gridStyles.mobileOverlay} onClick={() => setIsMobileOpen(false)}></div>
        )}
        <main className={gridStyles.contentWrapper} style={{ position: 'relative' }}>
          <div className={gridStyles.contentInner} style={{ width: '100%' }}>
            {children}
          </div>
        </main>
      </div>
      <Footer onCopyrightClick={() => setIsCavemanEnabled(!isCavemanEnabled)} />

    </>
  );
}

