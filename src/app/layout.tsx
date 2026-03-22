import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import gridStyles from "./layout.module.css";
import TopNavbar from "@/components/layout/TopNavbar";
import LeftSidebar from "@/components/layout/LeftSidebar";

const notoSans = Noto_Sans_KR({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "Review Site",
  description: "Interactive review site for movies, books, and restaurants",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSans.variable}`}>
      <body>
        <TopNavbar />
        <div className={gridStyles.mainContainer}>
          <LeftSidebar />
          <main className={gridStyles.contentWrapper}>
            <div className={gridStyles.contentInner}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
