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
  description: "일상 리뷰 사이트, 우가우가",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "WoogaWooga 우가우가",
    description: "일상 리뷰 사이트, 우가우가",
    url: "https://project-l2.vercel.app",
    siteName: "WoogaWooga",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 400,
        alt: "WoogaWooga Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WoogaWooga 우가우가",
    description: "일상 리뷰 사이트, 우가우가",
    images: ["/logo.png"],
  },
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
