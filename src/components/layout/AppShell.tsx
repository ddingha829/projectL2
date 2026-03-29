"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
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

  useEffect(() => {
    const checkSize = () => setIsMobileScreen(window.innerWidth <= 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Close sidebar on navigation (Fixes Bug 2: Login page hidden behind menu)
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, searchParams]);

  // Lock body scroll when mobile menu is open (Fixes Bug 1: Scroll issues)
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileOpen]);

  return (
    <>
      <TopNavbar onMobileToggle={() => setIsMobileOpen(!isMobileOpen)} />
      <div className={gridStyles.mainContainer}>
        <LeftSidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
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
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={{ 
                  x: { duration: 1.2, ease: [0.8, 0, 0.1, 1] },
                  opacity: { duration: 0.6, ease: "easeOut" }
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
