import type { Metadata } from "next";
import { Noto_Sans_KR, Outfit } from "next/font/google";
import "./globals.css";
import gridStyles from "./layout.module.css";
import AppShell from "@/components/layout/AppShell";
import { Suspense } from "react";

const notoSans = Noto_Sans_KR({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "WoogaWooga 우가우가",
  description: "평범한 사람들이 써나가는 위대한 일상",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSans.variable} ${outfit.variable}`}>
      <body>
        <Suspense fallback={null}>
          <AppShell>
            {children}
          </AppShell>
        </Suspense>
      </body>
    </html>
  );
}
