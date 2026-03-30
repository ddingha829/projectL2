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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams.toString()}`;
  const [isMobileScreen, setIsMobileScreen] = useState(false);
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
      <TopNavbar 
        key={`navbar-${user?.id || 'guest'}-${isLoading}`}
        onMobileToggle={() => setIsMobileOpen(!isMobileOpen)} 
        user={user}
        role={role}
        displayName={displayName}
      />
      <div className={gridStyles.mainContainer}>
        <LeftSidebar 
          key={`sidebar-${user?.id || 'guest'}-${isLoading}`}
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
          {isMobileScreen ? (
            <div className={gridStyles.contentInner} style={{ width: '100%' }}>
              {children}
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={key}
                className={gridStyles.contentInner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.5, 
                  ease: "easeInOut" 
                }}
                style={{ width: '100%' }}
              >
                <FrozenRoute>
                  {children}
                </FrozenRoute>
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
      {isMobileScreen && (role === 'admin' || role === 'editor') && (
        <Link href="/write" className={gridStyles.mobileFAB}>
          ✍️
        </Link>
      )}
    </>
  );
}
