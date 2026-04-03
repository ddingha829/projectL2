"use client";

import { useState, useEffect } from "react";
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
  const [cavemen, setCavemen] = useState<{ id: number; top: number; speed: number; delay: number }[]>([]);
  
  useEffect(() => {
    // Generate some random cavemen
    const newCavemen = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      top: Math.random() * 80 + 10,
      speed: Math.random() * 10 + 15, // 15-25s
      delay: Math.random() * 20
    }));
    setCavemen(newCavemen);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'hidden', opacity: 0.1 }}>

      <style>{`
        @keyframes cavemanRun {
          from { transform: translateX(-100px) rotate(0deg); }
          25% { transform: translateX(25vw) rotate(10deg); }
          50% { transform: translateX(50vw) rotate(-10deg); }
          75% { transform: translateX(75vw) rotate(10deg); }
          to { transform: translateX(110vw) rotate(0deg); }
        }
        @keyframes runWobble {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      {cavemen.map((c) => (
        <div 
          key={c.id}
          style={{
            position: 'absolute',
            top: `${c.top}%`,
            left: '-100px',
            animation: `cavemanRun ${c.speed}s linear ${c.delay}s infinite`,
          }}
        >
          <div style={{ animation: 'runWobble 0.4s ease-in-out infinite' }}>
            <svg width="60" height="60" viewBox="0 0 100 100">
              {/* Stickman Body */}
              <circle cx="40" cy="25" r="8" fill="currentColor" /> {/* Head */}
              <line x1="40" y1="33" x2="40" y2="65" stroke="currentColor" strokeWidth="4" /> {/* Spine */}
              <line x1="40" y1="40" x2="60" y2="45" stroke="currentColor" strokeWidth="4" /> {/* Arm 1 */}
              <line x1="40" y1="40" x2="25" y2="55" stroke="currentColor" strokeWidth="4" /> {/* Arm 2 */}
              <line x1="40" y1="65" x2="25" y2="85" stroke="currentColor" strokeWidth="4" /> {/* Leg 1 */}
              <line x1="40" y1="65" x2="55" y2="85" stroke="currentColor" strokeWidth="4" /> {/* Leg 2 */}
              {/* Axe */}
              <line x1="60" y1="45" x2="65" y2="20" stroke="#5d4037" strokeWidth="3" /> {/* Handle */}
              <path d="M55 15 L75 20 L60 30 Z" fill="#757575" /> {/* Stone Blade */}
            </svg>
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

    supabase.auth.getUser().then(({ data }) => syncAuth(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        syncAuth(session?.user);
        router.refresh();
      } else if (event === 'SIGNED_OUT') {
        syncAuth(null);
        router.push('/');
        router.refresh();
      } else if (event === 'USER_UPDATED') {
        syncAuth(session?.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

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
        <main className={gridStyles.contentWrapper} style={{ position: 'relative', overflowX: 'hidden' }}>
          <div className={gridStyles.contentInner} style={{ width: '100%' }}>
            {children}
          </div>
        </main>
      </div>
      <Footer onCopyrightClick={() => setIsCavemanEnabled(!isCavemanEnabled)} />

    </>
  );
}

