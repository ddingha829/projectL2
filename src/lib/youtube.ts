/**
 * YouTube URL 유틸리티 함수 (클라이언트/서버 공용)
 * 'use server' 파일과 분리하여 non-async export 오류 방지
 */

/**
 * YouTube URL에서 Video ID 및 타입(short/long) 추출
 * - Shorts: youtube.com/shorts/{id}
 * - Long: youtube.com/watch?v={id}, youtu.be/{id}
 */
export function parseYouTubeUrl(url: string): { videoId: string | null; videoType: 'short' | 'long' } {
  if (!url) return { videoId: null, videoType: 'long' }

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace('www.', '')

    // Shorts
    if (hostname === 'youtube.com' && parsed.pathname.startsWith('/shorts/')) {
      const videoId = parsed.pathname.split('/shorts/')[1]?.split(/[?#]/)[0] || null
      return { videoId, videoType: 'short' }
    }

    // Standard watch URL
    if (hostname === 'youtube.com' && parsed.pathname === '/watch') {
      const videoId = parsed.searchParams.get('v')
      return { videoId, videoType: 'long' }
    }

    // Short URL
    if (hostname === 'youtu.be') {
      const videoId = parsed.pathname.slice(1).split(/[?#]/)[0] || null
      return { videoId, videoType: 'long' }
    }

    // Embed URL
    if (hostname === 'youtube.com' && parsed.pathname.startsWith('/embed/')) {
      const videoId = parsed.pathname.split('/embed/')[1]?.split(/[?#]/)[0] || null
      return { videoId, videoType: 'long' }
    }
  } catch {
    // URL 파싱 실패 시 정규식으로 fallback
    const shortMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
    if (shortMatch) return { videoId: shortMatch[1], videoType: 'short' }

    const idMatch = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
    if (idMatch) return { videoId: idMatch[1], videoType: 'long' }
  }

  return { videoId: null, videoType: 'long' }
}

/**
 * YouTube 썸네일 URL 생성
 */
export function getYouTubeThumbnail(videoId: string, quality: 'maxres' | 'hq' | 'mq' = 'hq') {
  const qualityMap = {
    maxres: 'maxresdefault',
    hq: 'hqdefault',
    mq: 'mqdefault',
  }
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}
