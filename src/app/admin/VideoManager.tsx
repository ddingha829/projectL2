'use client'

import { useState, useEffect, useTransition } from 'react'
import styles from './admin.module.css'
import {
  getAllFeaturedVideos,
  addFeaturedVideo,
  updateFeaturedVideo,
  deleteFeaturedVideo,
  fetchInstagramOembed,
} from '@/app/actions/featuredVideos'
import { detectMediaType, parseYouTubeUrl, parseInstagramUrl, getYouTubeThumbnail } from '@/lib/media'

type MediaType = 'youtube_long' | 'youtube_short' | 'instagram'

interface MediaEntry {
  id: string
  url: string
  title: string | null
  caption: string | null
  media_type: MediaType
  thumbnail_url: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

const MEDIA_LABELS: Record<MediaType, string> = {
  youtube_long: '▶ YouTube',
  youtube_short: '🩳 Shorts',
  instagram: '📸 Instagram',
}

const BADGE_STYLE: Record<MediaType, React.CSSProperties> = {
  youtube_long: { background: '#ff0000', color: '#fff' },
  youtube_short: { background: '#000', color: '#fff' },
  instagram: { background: 'linear-gradient(135deg,#f09433,#dc2743,#bc1888)', color: '#fff' },
}

export default function VideoManager() {
  const [items, setItems] = useState<MediaEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // ─── Add form ───────────────────────────────────────────────
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newCaption, setNewCaption] = useState('')
  const [newThumbUrl, setNewThumbUrl] = useState('')
  const [newOrder, setNewOrder] = useState(0)

  // URL 미리보기 상태
  const [detectedType, setDetectedType] = useState<MediaType | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const fetchItems = async () => {
    setLoading(true)
    const res = await getAllFeaturedVideos()
    if (res.success) setItems((res.data || []) as MediaEntry[])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const [isFetchingThumb, setIsFetchingThumb] = useState(false)

  // URL 변경 → 타입 감지 + 미리보기 ID 추출 + 인스타 자동 추출
  const handleUrlChange = async (url: string) => {
    setNewUrl(url)
    if (!url.trim()) { setDetectedType(null); setPreviewId(null); return }

    const type = detectMediaType(url)
    setDetectedType(type)

    if (type === 'youtube_long' || type === 'youtube_short') {
      const { videoId } = parseYouTubeUrl(url)
      setPreviewId(videoId)
    } else if (type === 'instagram') {
      const { shortcode } = parseInstagramUrl(url)
      setPreviewId(shortcode)
      
      // 인스타 자동 썸네일 추출
      setIsFetchingThumb(true)
      const res = await fetchInstagramOembed(url)
      if (res.success && res.thumbnail_url) {
        setNewThumbUrl(res.thumbnail_url)
        if (!newTitle && res.author_name) setNewTitle(`${res.author_name}님의 게시물`)
        if (!newCaption && res.title) setNewCaption(res.title)
      } else {
        console.warn('Instagram fetch failed:', res.error)
      }
      setIsFetchingThumb(false)
    } else {
      setPreviewId(null)
    }
  }

  const handleAdd = () => {
    if (!newUrl.trim()) return
    startTransition(async () => {
      const res = await addFeaturedVideo({
        youtube_url: newUrl.trim(),
        title: newTitle.trim() || undefined,
        caption: newCaption.trim() || undefined,
        thumbnail_url: newThumbUrl.trim() || undefined,
        display_order: newOrder,
      })
      if (res.success) {
        setNewUrl(''); setNewTitle(''); setNewCaption(''); setNewThumbUrl(''); setNewOrder(0)
        setDetectedType(null); setPreviewId(null)
        await fetchItems()
      } else {
        alert('추가 실패: ' + res.error)
      }
    })
  }

  const handleToggleActive = (id: string, current: boolean) => {
    startTransition(async () => {
      await updateFeaturedVideo(id, { is_active: !current })
      await fetchItems()
    })
  }

  const handleDelete = (id: string, title: string | null) => {
    if (!confirm(`"${title || '미디어'}"을(를) 삭제하시겠습니까?`)) return
    startTransition(async () => {
      const res = await deleteFeaturedVideo(id)
      if (res.success) await fetchItems()
      else alert('삭제 실패: ' + res.error)
    })
  }

  const handleOrderChange = (id: string, val: number) => {
    startTransition(async () => {
      await updateFeaturedVideo(id, { display_order: val })
      await fetchItems()
    })
  }

  // 미리보기 썸네일 URL 계산
  const getPreviewThumb = () => {
    if (!detectedType || !previewId) return null
    if (detectedType === 'youtube_long' || detectedType === 'youtube_short') {
      return `https://img.youtube.com/vi/${previewId}/hqdefault.jpg`
    }
    return null // Instagram은 직접 입력
  }

  const previewThumb = getPreviewThumb()
  const isShortPreview = detectedType === 'youtube_short'
  const isInstaPreview = detectedType === 'instagram'

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
        🎬 추천 미디어 관리
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
        메인 페이지 <b>한줄평 ↔ 티끌러</b> 섹션 사이에 노출되는 YouTube / Instagram 콘텐츠를 관리합니다.<br />
        <span style={{ color: '#c13584', fontWeight: 600 }}>📸 Instagram</span>은 썸네일 이미지 URL을 직접 입력해야 합니다.
      </p>

      {/* ─── Add Form ─── */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 20, marginBottom: 28, border: '1.5px solid var(--border-medium)' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>+ 새 미디어 추가</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* URL */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="url"
                placeholder="URL 입력 (YouTube: youtube.com/watch?v=... | Instagram: instagram.com/p/...)"
                value={newUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                style={inputStyle}
              />
              {detectedType && (
                <span style={{ ...BADGE_STYLE[detectedType], padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {MEDIA_LABELS[detectedType]}
                </span>
              )}
            </div>

            {/* 제목 */}
            <input
              type="text"
              placeholder="제목"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={inputStyle}
            />

            {/* 인스타 전용: 캡션 + 썸네일 URL */}
            {isInstaPreview && (
              <>
                <input
                  type="text"
                  placeholder="캡션 (선택, 2줄로 표시됨)"
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  style={inputStyle}
                />
                <div style={{ position: 'relative' }}>
                  <input
                    type="url"
                    placeholder={isFetchingThumb ? "📸 썸네일 자동 추출 중..." : "📸 썸네일 이미지 URL (자동 추출 실패 시 직접 입력)"}
                    value={newThumbUrl}
                    onChange={(e) => setNewThumbUrl(e.target.value)}
                    style={{ ...inputStyle, borderColor: newThumbUrl ? 'var(--border-medium)' : '#c13584', paddingRight: 36 }}
                    disabled={isFetchingThumb}
                  />
                  {!newThumbUrl && (
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#c13584', fontWeight: 700 }}>필수</span>
                  )}
                </div>
              </>
            )}

            {/* YouTube 전용: 커스텀 썸네일 (선택) */}
            {(detectedType === 'youtube_long' || detectedType === 'youtube_short') && (
              <input
                type="url"
                placeholder="커스텀 썸네일 URL (선택 — 비워두면 YouTube 자동 추출)"
                value={newThumbUrl}
                onChange={(e) => setNewThumbUrl(e.target.value)}
                style={inputStyle}
              />
            )}

            {/* 노출 순서 */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>노출 순서</label>
              <input
                type="number"
                value={newOrder}
                min={0}
                onChange={(e) => setNewOrder(parseInt(e.target.value) || 0)}
                style={{ ...inputStyle, width: 80 }}
              />
            </div>
          </div>

          {/* 미리보기 */}
          {(previewThumb || (isInstaPreview && newThumbUrl)) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <img
                src={isInstaPreview ? newThumbUrl : (previewThumb || '')}
                alt="미리보기"
                style={{
                  width: isShortPreview ? 64 : 110,
                  aspectRatio: isShortPreview ? '9/16' : '1/1',
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1.5px solid var(--border-medium)',
                }}
              />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>미리보기</span>
            </div>
          )}
          {detectedType === 'youtube_long' && previewThumb && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <img
                src={previewThumb}
                alt="미리보기"
                style={{ width: 110, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, border: '1.5px solid var(--border-medium)' }}
              />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>미리보기</span>
            </div>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={!newUrl.trim() || isPending || (isInstaPreview && !newThumbUrl.trim())}
          className={styles.actionBtn}
          style={{
            marginTop: 14, background: '#ff4804', color: '#fff',
            padding: '8px 20px', borderRadius: 8, fontWeight: 700,
            opacity: (!newUrl.trim() || isPending || (isInstaPreview && !newThumbUrl.trim())) ? 0.5 : 1,
          }}
        >
          {isPending ? '추가 중...' : '미디어 추가'}
        </button>

        {isInstaPreview && !newThumbUrl && !isFetchingThumb && (
          <p style={{ fontSize: '0.78rem', color: '#c13584', marginTop: 8 }}>
            💡 자동 추출에 실패했다면, Instagram 게시물 이미지를 우클릭 → <b>이미지 주소 복사</b> 후 위에 붙여넣으세요.
          </p>
        )}
      </div>

      {/* ─── 목록 ─── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>불러오는 중...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>등록된 미디어가 없습니다.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => {
            const type = item.media_type
            const isInsta = type === 'instagram'

            // 썸네일 URL
            let thumbSrc = item.thumbnail_url || null
            if (!thumbSrc && !isInsta) {
              const parsed = parseYouTubeUrl(item.url)
              thumbSrc = parsed.videoId ? getYouTubeThumbnail(parsed.videoId, 'mq') : null
            }

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex', gap: 16, alignItems: 'center',
                  background: item.is_active ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                  border: `1.5px solid ${item.is_active ? 'var(--border-medium)' : 'var(--border-light)'}`,
                  borderRadius: 12, padding: '12px 16px',
                  opacity: item.is_active ? 1 : 0.55,
                }}
              >
                {/* 썸네일 */}
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt={item.title || '썸네일'}
                    style={{
                      width: type === 'youtube_short' ? 36 : 72,
                      aspectRatio: type === 'youtube_short' ? '9/16' : '1/1',
                      objectFit: 'cover',
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div style={{
                    width: 72, height: 72, borderRadius: 6, flexShrink: 0,
                    background: isInsta ? 'linear-gradient(135deg,#f09433,#dc2743,#bc1888)' : '#eee',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {isInsta ? '📸' : '▶'}
                  </div>
                )}

                {/* 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ ...BADGE_STYLE[type], padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 800 }}>
                      {MEDIA_LABELS[type]}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      {item.title || '(제목 없음)'}
                    </span>
                  </div>
                  {item.caption && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                      {item.caption}
                    </div>
                  )}
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.url}
                  </div>
                </div>

                {/* 순서 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>순서</label>
                  <input
                    type="number"
                    defaultValue={item.display_order}
                    min={0}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value) || 0
                      if (val !== item.display_order) handleOrderChange(item.id, val)
                    }}
                    style={{ ...inputStyle, width: 60, padding: '4px 8px', fontSize: '0.8rem' }}
                  />
                </div>

                {/* 컨트롤 */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleToggleActive(item.id, item.is_active)} className={styles.actionBtn} title={item.is_active ? '비활성화' : '활성화'}>
                    {item.is_active ? '🔕' : '🔔'}
                  </button>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.actionBtn} title="보기">👁️</a>
                  <button onClick={() => handleDelete(item.id, item.title)} className={styles.actionBtn} title="삭제">🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 14px',
  borderRadius: 8,
  border: '1.5px solid var(--border-medium)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  outline: 'none',
  boxSizing: 'border-box',
}
