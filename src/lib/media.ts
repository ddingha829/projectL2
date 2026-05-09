/**
 * 미디어 URL 유틸리티 (YouTube + Instagram)
 * 클라이언트/서버 공용 — 'use server' 파일과 분리
 */

export type MediaType = 'youtube_long' | 'youtube_short' | 'instagram'

export interface ParsedMedia {
  mediaType: MediaType
  // YouTube
  videoId?: string | null
  thumbnailUrl?: string | null
  watchUrl?: string
  // Instagram
  shortcode?: string | null
  embedUrl?: string
}

// ─────────────────────────────────────────────
// YouTube
// ─────────────────────────────────────────────

export function parseYouTubeUrl(url: string): { videoId: string | null; videoType: 'short' | 'long' } {
  if (!url) return { videoId: null, videoType: 'long' }

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace('www.', '')

    if (hostname === 'youtube.com' && parsed.pathname.startsWith('/shorts/')) {
      const videoId = parsed.pathname.split('/shorts/')[1]?.split(/[?#]/)[0] || null
      return { videoId, videoType: 'short' }
    }
    if (hostname === 'youtube.com' && parsed.pathname === '/watch') {
      return { videoId: parsed.searchParams.get('v'), videoType: 'long' }
    }
    if (hostname === 'youtu.be') {
      const videoId = parsed.pathname.slice(1).split(/[?#]/)[0] || null
      return { videoId, videoType: 'long' }
    }
    if (hostname === 'youtube.com' && parsed.pathname.startsWith('/embed/')) {
      const videoId = parsed.pathname.split('/embed/')[1]?.split(/[?#]/)[0] || null
      return { videoId, videoType: 'long' }
    }
  } catch {
    const shortMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
    if (shortMatch) return { videoId: shortMatch[1], videoType: 'short' }
    const idMatch = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
    if (idMatch) return { videoId: idMatch[1], videoType: 'long' }
  }

  return { videoId: null, videoType: 'long' }
}

export function getYouTubeThumbnail(videoId: string, quality: 'maxres' | 'hq' | 'mq' = 'hq') {
  const qualityMap = { maxres: 'maxresdefault', hq: 'hqdefault', mq: 'mqdefault' }
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}

// ─────────────────────────────────────────────
// Instagram
// ─────────────────────────────────────────────

/**
 * Instagram URL에서 shortcode 추출
 * 지원 형식:
 *   https://www.instagram.com/p/{shortcode}/
 *   https://www.instagram.com/reel/{shortcode}/
 *   https://www.instagram.com/tv/{shortcode}/
 *   https://instagr.am/p/{shortcode}/
 */
export function parseInstagramUrl(url: string): { shortcode: string | null } {
  if (!url) return { shortcode: null }

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace('www.', '')

    if (hostname === 'instagram.com' || hostname === 'instagr.am') {
      const match = parsed.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?/)
      if (match) return { shortcode: match[2] }
    }
  } catch {
    const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
    if (match) return { shortcode: match[1] }
  }

  return { shortcode: null }
}

/**
 * URL을 분석해서 미디어 타입 자동 감지
 */
export function detectMediaType(url: string): MediaType | null {
  if (!url) return null
  const lower = url.toLowerCase()

  if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
    return 'instagram'
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    const { videoType } = parseYouTubeUrl(url)
    return videoType === 'short' ? 'youtube_short' : 'youtube_long'
  }

  return null
}

/**
 * DB row를 카드 렌더링용 데이터로 변환
 */
export function resolveMediaCard(row: {
  id: string
  url: string
  title?: string | null
  caption?: string | null
  media_type: MediaType
  thumbnail_url?: string | null
  display_order: number
  is_active: boolean
}) {
  const base = {
    id: row.id,
    url: row.url,
    title: row.title || null,
    caption: row.caption || null,
    mediaType: row.media_type,
    displayOrder: row.display_order,
    isActive: row.is_active,
    // stored thumbnail takes priority
    thumbnailUrl: row.thumbnail_url || null,
  }

  if (row.media_type === 'instagram') {
    const { shortcode } = parseInstagramUrl(row.url)
    return {
      ...base,
      shortcode,
      watchUrl: row.url,
      embedUrl: shortcode ? `https://www.instagram.com/p/${shortcode}/embed/captioned/` : null,
    }
  }

  // YouTube
  const { videoId, videoType } = parseYouTubeUrl(row.url)
  const autoThumb = videoId ? getYouTubeThumbnail(videoId, 'hq') : null

  return {
    ...base,
    videoId,
    thumbnailUrl: row.thumbnail_url || autoThumb,
    watchUrl: videoType === 'short' && videoId
      ? `https://www.youtube.com/shorts/${videoId}`
      : `https://www.youtube.com/watch?v=${videoId}`,
  }
}
