"use client";

import { useState } from "react";
import TopNavbar from "./TopNavbar";
import LeftSidebar from "./LeftSidebar";
import gridStyles from "@/app/layout.module.css";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      <TopNavbar onMobileToggle={() => setIsMobileOpen(!isMobileOpen)} />
      <div className={gridStyles.mainContainer}>
        <LeftSidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
        {isMobileOpen && (
          <div className={gridStyles.mobileOverlay} onClick={() => setIsMobileOpen(false)}></div>
        )}
        <main className={gridStyles.contentWrapper}>
          <div className={gridStyles.contentInner}>
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
