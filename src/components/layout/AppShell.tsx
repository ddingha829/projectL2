import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileOpen]);

  // Auth Sync Logic
  useEffect(() => {
    const fetchAuthData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: profile } = await supabase.from('profiles').select('role, display_name').eq('id', authUser.id).single();
        if (profile) {
          setRole(profile.role);
          setDisplayName(profile.display_name || authUser.user_metadata?.full_name || authUser.user_metadata?.display_name || "");
        } else {
          setDisplayName(authUser.user_metadata?.full_name || authUser.user_metadata?.display_name || "");
        }
      } else {
        setUser(null);
        setRole("user");
        setDisplayName("");
      }
    };
    fetchAuthData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Trigger refresh on significant events to sync server components
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh();
      }
      
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      
      if (sessionUser) {
        const { data: profile } = await supabase.from('profiles').select('role, display_name').eq('id', sessionUser.id).single();
        if (profile) {
          setRole(profile.role);
          setDisplayName(profile.display_name || sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.display_name || "");
        } else {
          setDisplayName(sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.display_name || "");
        }
      } else {
        setRole("user");
        setDisplayName("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <>
      <TopNavbar 
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
    </>
  );
}
