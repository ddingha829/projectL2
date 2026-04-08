import type { Metadata } from "next";
import { Noto_Sans_KR, Outfit, Nanum_Myeongjo, Nanum_Gothic, Inter, Merriweather } from "next/font/google";
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

const nanumMyeongjo = Nanum_Myeongjo({
  variable: "--font-nanum-myeongjo",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const nanumGothic = Nanum_Gothic({
  variable: "--font-nanum-gothic",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://project-l2.vercel.app"),
  title: {
    default: "WoogaWooga 우가우가 | 일상 리뷰 매거진",
    template: "%s | 우가우가"
  },
  description: "일상의 모든 순간을 리뷰합니다. 영화, 책, 게임, 맛집까지 에디터들이 전하는 생생한 리뷰 사이트, 우가우가.",
  keywords: ["리뷰", "매거진", "영화 리뷰", "맛집 추천", "도서 리뷰", "게임 리뷰", "우가우가", "WoogaWooga"],
  authors: [{ name: "WoogaWooga Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "WoogaWooga 우가우가",
    description: "일상의 모든 것을 리뷰하는 매거진, 우가우가",
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
    description: "일상의 모든 것을 리뷰하는 매거진, 우가우가",
    images: ["/logo.png"],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSans.variable} ${outfit.variable} ${nanumMyeongjo.variable} ${nanumGothic.variable} ${inter.variable} ${merriweather.variable}`}>
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
