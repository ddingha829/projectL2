"use client";

import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import TopNavbar from "./TopNavbar";
import LeftSidebar from "./LeftSidebar";
import gridStyles from "@/app/layout.module.css";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, searchParams]);

  return (
    <>
      <TopNavbar onMobileToggle={() => setIsMobileOpen(!isMobileOpen)} />
      <div className={gridStyles.mainContainer}>
        <LeftSidebar isOpen={isMobileOpen} />
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
