import type { Metadata } from "next";
import { Noto_Sans_KR, Outfit, Nanum_Myeongjo, Nanum_Gothic } from "next/font/google";
import "./globals.css";
import "@/styles/editor-blots.css"; // 에디터 커스텀 카드 전용 글로벌 스타일
import gridStyles from "./layout.module.css";
import AppShell from "@/components/layout/AppShell";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const notoSans = Noto_Sans_KR({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const nanumMyeongjo = Nanum_Myeongjo({
  variable: "--font-nanum-myeongjo",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: 'swap',
});

const nanumGothic = Nanum_Gothic({
  variable: "--font-nanum-gothic",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: 'swap',
});

const PRECONNECT_DOMAINS = [
  "https://lhscidkpsvymshkgvskp.supabase.co",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
];



export const metadata: Metadata = {
  metadataBase: new URL("https://ticgle.kr"),
  title: {
    default: "티끌 ticgle | 티끌 모아 반짝이는, 일상 매거진",
    template: "%s | 티끌 ticgle"
  },
  description: "티끌 모아 반짝이는, 일상 매거진",
  keywords: ["리뷰", "매거진", "일상", "에세이", "티끌", "Ticgle"],
  authors: [{ name: "Ticgle Team" }],
  verification: {
    other: {
      "naver-site-verification": "f0c679c5f194d03d31525b3c07c1dca4e79a85bc",
    },
  },
  openGraph: {
    title: "티끌 ticgle",
    description: "티끌 모아 반짝이는, 일상 매거진",
    url: "https://ticgle.kr",
    siteName: "Ticgle",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "https://ticgle.kr/preview.png",
        width: 1200,
        height: 630,
        alt: "티끌 ticgle",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "티끌 ticgle",
    description: "티끌 모아 반짝이는, 일상 매거진",
    images: ["https://ticgle.kr/preview.png"],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSans.variable} ${outfit.variable} ${nanumMyeongjo.variable} ${nanumGothic.variable}`}>
      <head>
        {PRECONNECT_DOMAINS.map((domain) => (
          <link key={domain} rel="preconnect" href={domain} crossOrigin="anonymous" />
        ))}
        {PRECONNECT_DOMAINS.map((domain) => (
          <link key={domain} rel="dns-prefetch" href={domain} />
        ))}
      </head>
      <body>
        <Suspense fallback={null}>
          <AppShell>
            {children}
          </AppShell>
          <Analytics />
          <SpeedInsights />
        </Suspense>
      </body>
    </html>
  );
}
