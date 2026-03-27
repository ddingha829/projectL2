"use client";

import { useState } from "react";
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

  return (
    <>
      <TopNavbar onMobileToggle={() => setIsMobileOpen(!isMobileOpen)} />
      <div className={gridStyles.mainContainer}>
        <LeftSidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
        {isMobileOpen && (
          <div className={gridStyles.mobileOverlay} onClick={() => setIsMobileOpen(false)}></div>
        )}
        <main className={gridStyles.contentWrapper} style={{ position: 'relative', overflowX: 'hidden' }}>
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
        </main>
      </div>
    </>
  );
}
