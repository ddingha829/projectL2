'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * 관리자 권한 확인
 */
async function isAdmin() {
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
 * 다음 회차 번호 가져오기 (예: 2026-N)
 */
export async function getNextIssueNumber() {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()
  
  const { data, error } = await supabase
    .from('magazine_issues')
    .select('issue_number')
    .ilike('issue_number', `${currentYear}-%`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    return `${currentYear}-1`
  }

  const lastNumber = parseInt(data[0].issue_number.split('-')[1])
  return `${currentYear}-${lastNumber + 1}`
}

/**
 * 매거진 발행
 */
export async function publishMagazineIssue(formData: {
  issue_number: string
  post_a_id: string
  post_b1_id: string
  post_b2_id: string
  post_b3_id: string
}) {
  if (!(await isAdmin())) {
    return { success: false, error: '관리자 권한이 필요합니다.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('magazine_issues')
    .insert([
      {
        issue_number: formData.issue_number,
        post_a_id: formData.post_a_id,
        post_b1_id: formData.post_b1_id,
        post_b2_id: formData.post_b2_id,
        post_b3_id: formData.post_b3_id,
        published_at: new Date().toISOString()
      }
    ])
    .select()

  if (error) {
    console.error('Publish error:', error)
    return { success: false, error: '매거진 발행 중 오류가 발생했습니다: ' + error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  
  return { success: true, data }
}

/**
 * 최신 매거진 회차 가져오기
 */
export async function getLatestMagazineIssue() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('magazine_issues')
    .select(`
      *,
      post_a:posts!post_a_id(*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets)),
      post_b1:posts!post_b1_id(*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets)),
      post_b2:posts!post_b2_id(*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets)),
      post_b3:posts!post_b3_id(*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets))
    `)
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { data }
}

/**
 * 모든 매거진 회차 목록 가져오기
 */
export async function getAllMagazineIssues() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('magazine_issues')
    .select(`
      *,
      post_a:posts!post_a_id(*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets)),
      post_b1:posts!post_b1_id(*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets)),
      post_b2:posts!post_b2_id(*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets)),
      post_b3:posts!post_b3_id(*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets))
    `)
    .order('published_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { data }
}
