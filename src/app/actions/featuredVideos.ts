'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseYouTubeUrl, parseInstagramUrl, detectMediaType, resolveMediaCard, type MediaType } from '@/lib/media'

// ─── 인스타그램 oEmbed 썸네일 자동 추출 ───────────────────────────────
export async function fetchInstagramOembed(url: string) {
  if (!(await checkAdmin())) return { success: false, error: '관리자 권한이 필요합니다.' }

  const appId = process.env.META_APP_ID
  const clientToken = process.env.META_CLIENT_TOKEN
  if (!appId || !clientToken) return { success: false, error: 'Meta 토큰이 설정되지 않았습니다.' }

  const accessToken = `${appId}|${clientToken}`
  const apiUrl = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${accessToken}`

  try {
    const res = await fetch(apiUrl)
    const data = await res.json()
    
    if (data.error) {
      console.error('Instagram oEmbed Error:', data.error)
      if (data.error.code === 10) {
        return { success: false, error: '앱 검수(App Review)가 필요합니다. Meta 개발자 센터에서 oEmbed Read 권한 검수를 신청해주세요.' }
      }
      return { success: false, error: data.error.message }
    }

    return { 
      success: true, 
      thumbnail_url: data.thumbnail_url,
      title: data.title || '',
      author_name: data.author_name || ''
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── 관리자 권한 확인 ───────────────────────────────────────────
async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

// ─── 메인페이지용 조회 ──────────────────────────────────────────
export async function getFeaturedVideos() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('featured_media')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getFeaturedVideos error:', error)
    return []
  }

  return (data || []).map((row) => resolveMediaCard(row))
}

// ─── 관리자용 전체 조회 ─────────────────────────────────────────
export async function getAllFeaturedVideos() {
  if (!(await checkAdmin())) return { success: false, error: '관리자 권한이 필요합니다.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('featured_media')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data || [] }
}

// ─── 미디어 추가 ────────────────────────────────────────────────
export async function addFeaturedVideo(formData: {
  youtube_url: string      // URL 필드명은 하위 호환 유지
  title?: string
  caption?: string
  thumbnail_url?: string   // 인스타 또는 커스텀 썸네일
  display_order?: number
}) {
  if (!(await checkAdmin())) return { success: false, error: '관리자 권한이 필요합니다.' }

  const url = formData.youtube_url.trim()
  const mediaType = detectMediaType(url)
  if (!mediaType) return { success: false, error: '지원하지 않는 URL입니다. (YouTube 또는 Instagram)' }

  // 유효성 검사
  if (mediaType === 'youtube_long' || mediaType === 'youtube_short') {
    const { videoId } = parseYouTubeUrl(url)
    if (!videoId) return { success: false, error: '유효하지 않은 YouTube URL입니다.' }
  } else {
    const { shortcode } = parseInstagramUrl(url)
    if (!shortcode) return { success: false, error: '유효하지 않은 Instagram URL입니다.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('featured_media')
    .insert([{
      url,
      title: formData.title || null,
      caption: formData.caption || null,
      media_type: mediaType,
      thumbnail_url: formData.thumbnail_url || null,
      display_order: formData.display_order ?? 0,
      is_active: true,
    }])
    .select()

  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  revalidatePath('/admin')
  return { success: true, data }
}

// ─── 미디어 수정 ────────────────────────────────────────────────
export async function updateFeaturedVideo(id: string, updates: {
  youtube_url?: string
  title?: string
  caption?: string
  thumbnail_url?: string
  display_order?: number
  is_active?: boolean
}) {
  if (!(await checkAdmin())) return { success: false, error: '관리자 권한이 필요합니다.' }

  const supabase = await createClient()

  // URL 변경 시 media_type 재감지
  let mediaType: MediaType | undefined
  const dbUpdates: Record<string, unknown> = {}

  if (updates.youtube_url !== undefined) {
    const newUrl = updates.youtube_url.trim()
    mediaType = detectMediaType(newUrl) || undefined
    dbUpdates.url = newUrl
    if (mediaType) dbUpdates.media_type = mediaType
  }
  if (updates.title !== undefined) dbUpdates.title = updates.title || null
  if (updates.caption !== undefined) dbUpdates.caption = updates.caption || null
  if (updates.thumbnail_url !== undefined) dbUpdates.thumbnail_url = updates.thumbnail_url || null
  if (updates.display_order !== undefined) dbUpdates.display_order = updates.display_order
  if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active
  dbUpdates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('featured_media')
    .update(dbUpdates)
    .eq('id', id)
    .select()

  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  revalidatePath('/admin')
  return { success: true, data }
}

// ─── 미디어 삭제 ────────────────────────────────────────────────
export async function deleteFeaturedVideo(id: string) {
  if (!(await checkAdmin())) return { success: false, error: '관리자 권한이 필요합니다.' }

  const supabase = await createClient()
  const { error } = await supabase.from('featured_media').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  revalidatePath('/admin')
  return { success: true }
}
