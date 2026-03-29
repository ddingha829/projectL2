'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * 현재 로그인한 유저가 admin인지 확인합니다.
 * profiles 테이블의 role 컬럼이 'admin'인지 체크합니다.
 */
async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
}

/**
 * 특정 게시물을 Hero로 지정합니다.
 * - 이미 Hero인 경우 해제합니다 (토글).
 * - Hero 게시물이 이미 3개이면 가장 먼저 지정된(hero_at 가장 오래된) 것을 자동 해제합니다.
 */
export async function toggleHeroPost(postId: string): Promise<{ success: boolean; error?: string; action?: 'set' | 'unset' }> {
  const supabase = await createClient()

  if (!(await isAdmin())) {
    return { success: false, error: '관리자 권한이 필요합니다.' }
  }

  // 현재 포스트 상태 확인
  const { data: currentPost, error: fetchError } = await supabase
    .from('posts')
    .select('id, is_hero, hero_at')
    .eq('id', postId)
    .single()

  if (fetchError || !currentPost) {
    return { success: false, error: '게시물을 찾을 수 없습니다.' }
  }

  // 이미 Hero인 경우 → 해제
  if (currentPost.is_hero) {
    const { error } = await supabase
      .from('posts')
      .update({ is_hero: false, hero_at: null })
      .eq('id', postId)

    if (error) return { success: false, error: '히어로 해제 중 오류가 발생했습니다.' }
    revalidatePath('/', 'layout')
    return { success: true, action: 'unset' }
  }

  // Hero가 아닌 경우 → 지정
  // 현재 Hero 게시물 목록 가져오기 (오래된 순서)
  const { data: heroList, error: heroFetchError } = await supabase
    .from('posts')
    .select('id, hero_at')
    .eq('is_hero', true)
    .order('hero_at', { ascending: true })

  if (heroFetchError) {
    return { success: false, error: '히어로 목록 조회 중 오류가 발생했습니다.' }
  }

  // 이미 3개면 가장 오래된 것 해제
  if (heroList && heroList.length >= 3) {
    const oldest = heroList[0]
    await supabase
      .from('posts')
      .update({ is_hero: false, hero_at: null })
      .eq('id', oldest.id)
  }

  // 현재 포스트를 Hero로 지정
  const { error: setError } = await supabase
    .from('posts')
    .update({ is_hero: true, hero_at: new Date().toISOString() })
    .eq('id', postId)

  if (setError) return { success: false, error: '히어로 지정 중 오류가 발생했습니다.' }

  revalidatePath('/', 'layout')
  return { success: true, action: 'set' }
}

/**
 * 현재 유저의 admin 여부를 클라이언트에서 확인할 수 있도록 반환합니다.
 */
export async function getAdminStatus(): Promise<{ isAdmin: boolean }> {
  return { isAdmin: await isAdmin() }
}
