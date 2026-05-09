"use client";

import styles from "../../app/page.module.css";
import cardStyles from "./MediaSection.module.css";
import SectionLayout from "@/components/shared/SectionLayout";
import Image from "next/image";
import { useState } from "react";

type MediaType = "youtube_long" | "youtube_short" | "instagram";

interface MediaItem {
  id: string;
  url: string;
  title: string | null;
  caption: string | null;
  mediaType: MediaType;
  thumbnailUrl: string | null;
  watchUrl?: string;
  videoId?: string | null;
  shortcode?: string | null;
}

interface MediaSectionProps {
  videos: MediaItem[];
  isMobile: boolean;
}

// ─── 인스타그램 카드 ─────────────────────────────────────────────
function InstagramCard({ item }: { item: MediaItem }) {
  const [imgError, setImgError] = useState(false);

  const thumbnailSrc = !imgError && item.thumbnailUrl ? item.thumbnailUrl : null;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cardStyles.mediaCard} ${cardStyles.mediaCardInsta}`}
      aria-label={item.title || "Instagram 게시물"}
    >
      {/* 1:1 썸네일 */}
      <div className={cardStyles.instaThumbWrap}>
        {thumbnailSrc ? (
          <Image
            src={thumbnailSrc}
            alt={item.title || "Instagram 썸네일"}
            fill
            className={cardStyles.mediaThumb}
            sizes="(max-width: 768px) 55vw, 220px"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          /* 썸네일 없으면 인스타 그라디언트 플레이스홀더 */
          <div className={cardStyles.instaPlaceholder}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="white" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="4.2" stroke="white" strokeWidth="1.8" />
              <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
            </svg>
            <span className={cardStyles.instaPlaceholderText}>Instagram</span>
          </div>
        )}

        {/* 링크 오버레이 */}
        <div className={cardStyles.mediaPlayOverlay}>
          <div className={cardStyles.instaOpenBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
        </div>

        {/* 뱃지 */}
        <span className={`${cardStyles.typeBadge} ${cardStyles.typeBadgeInsta}`}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 3 }}>
            <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
          </svg>
          Instagram
        </span>
      </div>

      {/* 카드 바디 */}
      <div className={cardStyles.mediaCardBody}>
        <p className={cardStyles.mediaTitle}>
          {item.title || "Instagram 게시물"}
        </p>
        {item.caption && (
          <p className={cardStyles.mediaCaption}>{item.caption}</p>
        )}
        <div className={cardStyles.mediaCardFooter}>
          <span className={`${cardStyles.watchLabel} ${cardStyles.watchLabelInsta}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 3 }}>
              <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
            </svg>
            인스타그램에서 보기 ↗
          </span>
        </div>
      </div>
    </a>
  );
}

// ─── 유튜브 카드 ──────────────────────────────────────────────────
function YouTubeCard({ item }: { item: MediaItem }) {
  const [imgError, setImgError] = useState(false);
  const isShort = item.mediaType === "youtube_short";

  const thumbnailSrc = imgError
    ? (item.videoId ? `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg` : null)
    : item.thumbnailUrl;

  return (
    <a
      href={item.watchUrl || item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cardStyles.mediaCard} ${isShort ? cardStyles.mediaCardShort : cardStyles.mediaCardLong}`}
      aria-label={item.title || "YouTube 영상"}
    >
      {/* 썸네일 */}
      <div className={`${cardStyles.ytThumbWrap} ${isShort ? cardStyles.ytThumbShort : cardStyles.ytThumbLong}`}>
        {thumbnailSrc ? (
          <Image
            src={thumbnailSrc}
            alt={item.title || "YouTube 썸네일"}
            fill
            className={cardStyles.mediaThumb}
            sizes={isShort ? "(max-width: 768px) 42vw, 120px" : "(max-width: 768px) 55vw, 220px"}
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className={cardStyles.ytPlaceholder}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="rgba(255,0,0,0.15)" />
              <path d="M10 8l6 4-6 4V8z" fill="#ff0000" />
            </svg>
          </div>
        )}

        <div className={cardStyles.mediaPlayOverlay}>
          <div className={cardStyles.ytPlayBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M8 5v14l11-7L8 5z" fill="currentColor" />
            </svg>
          </div>
        </div>

        <span className={`${cardStyles.typeBadge} ${isShort ? cardStyles.typeBadgeShort : cardStyles.typeBadgeLong}`}>
          {isShort ? (
            <>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 3 }}>
                <path d="M17.77 10.32l-1.2-.5L18 9.19c1.55-.66 2.28-2.41 1.62-3.96L18.9 3.82c-.66-1.55-2.41-2.28-3.96-1.62L6 6c-1.55.66-2.28 2.41-1.62 3.96l.31.74C5.25 12.25 6.8 13 8.36 12.9l1.54-.1-1.13.48C7.22 14 6.5 15.74 7.16 17.29l.31.74C8.13 19.58 9.87 20.3 11.42 19.65l7.1-3.01c1.55-.66 2.28-2.41 1.62-3.96l-.31-.74c-.34-.8-1.01-1.37-1.76-1.62z" />
              </svg>
              Shorts
            </>
          ) : (
            <>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 3 }}>
                <path d="M21.593 7.203a2.506 2.506 0 0 0-1.762-1.766C18.265 5.007 12 5 12 5s-6.264-.007-7.831.404a2.56 2.56 0 0 0-1.766 1.778c-.413 1.566-.417 4.814-.417 4.814s-.004 3.264.406 4.814c.23.857.905 1.534 1.763 1.765 1.582.43 7.83.437 7.83.437s6.265.007 7.831-.403a2.515 2.515 0 0 0 1.767-1.763c.414-1.565.417-4.812.417-4.812s.02-3.265-.407-4.831zM9.996 15.005l.005-6 5.207 3.005-5.212 2.995z" />
              </svg>
              YouTube
            </>
          )}
        </span>
      </div>

      {/* 카드 바디 */}
      <div className={cardStyles.mediaCardBody}>
        <p className={cardStyles.mediaTitle}>
          {item.title || "YouTube 영상"}
        </p>
        <div className={cardStyles.mediaCardFooter}>
          <span className={`${cardStyles.watchLabel} ${cardStyles.watchLabelYt}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 3 }}>
              <path d="M21.593 7.203a2.506 2.506 0 0 0-1.762-1.766C18.265 5.007 12 5 12 5s-6.264-.007-7.831.404a2.56 2.56 0 0 0-1.766 1.778c-.413 1.566-.417 4.814-.417 4.814s-.004 3.264.406 4.814c.23.857.905 1.534 1.763 1.765 1.582.43 7.83.437 7.83.437s6.265.007 7.831-.403a2.515 2.515 0 0 0 1.767-1.763c.414-1.565.417-4.812.417-4.812s.02-3.265-.407-4.831zM9.996 15.005l.005-6 5.207 3.005-5.212 2.995z" />
            </svg>
            유튜브에서 보기 ↗
          </span>
        </div>
      </div>
    </a>
  );
}

// ─── 섹션 컨테이너 ────────────────────────────────────────────────
export function YouTubeSection({ videos, isMobile }: MediaSectionProps) {
  if (!videos || videos.length === 0) return null;

  return (
    <SectionLayout
      title="티끌 "
      titleHighlight="픽"
      noGrid
      className={styles.editorsSection}
    >
      <div className={`${cardStyles.mediaGrid} ${isMobile ? styles.horizontalScrollMobile : ""}`}>
        {videos.map((item) =>
          item.mediaType === "instagram" ? (
            <InstagramCard key={item.id} item={item} />
          ) : (
            <YouTubeCard key={item.id} item={item} />
          )
        )}
      </div>
    </SectionLayout>
  );
}
