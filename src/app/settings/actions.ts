'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' }
  }

  const displayName = formData.get('displayName') as string
  const bio = formData.get('bio') as string
  const avatarUrl = formData.get('avatarUrl') as string
  const color = formData.get('color') as string
  const bulletsRaw = formData.get('bullets') as string
  const bullets = bulletsRaw ? bulletsRaw.split('\n').filter(b => b.trim() !== '') : []

  // Get current profile for better data integrity
  const { data: profile } = await supabase.from('profiles').select('role, bullets').eq('id', user.id).single()
  const isWriter = profile?.role === "admin" || profile?.role === "editor"

  // Update profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      bio: bio,
      avatar_url: avatarUrl,
      color: color,
      bullets: (isWriter && bulletsRaw) ? bullets : (profile?.bullets || []),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('Profile update error:', profileError)
    return { success: false, error: '프로필 업데이트 중 오류가 발생했습니다: ' + profileError.message }
  }

  // ALSO update Auth metadata for immediate global sync
  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: { 
      display_name: displayName,
      full_name: displayName 
    }
  })

  if (authUpdateError) {
    console.warn('Auth metadata sync failed', authUpdateError)
    // Non-critical, so we still return success if DB profile was updated
  }

  revalidatePath('/', 'layout')
  revalidatePath('/settings')
  return { success: true }
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || password.length < 6) {
    return { success: false, error: '비밀번호는 최소 6자 이상이어야 합니다.' }
  }

  if (password !== confirmPassword) {
    return { success: false, error: '비밀번호가 일치하지 않습니다.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { success: false, error: '비밀번호 변경 중 오류가 발생했습니다: ' + error.message }
  }

  return { success: true }
}
