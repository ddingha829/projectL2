'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * 일반 유저가 리뷰 아카이브에서 평점을 매기고 한줄평을 남깁니다.
 */
export async function submitUserReview(subject: string, rating: number, comment: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  if (rating < 1 || rating > 10) {
    return { success: false, error: '평점은 1점에서 10점 사이여야 합니다.' }
  }

  const { error } = await supabase
    .from('user_reviews')
    .insert({
      subject,
      rating,
      comment,
      user_id: user.id
    })

  if (error) {
    console.error('Error submitting user review:', error)
    return { success: false, error: '리뷰 등록 중 오류가 발생했습니다.' }
  }

  revalidatePath('/reviews')
  return { success: true }
}

/**
 * 특정 주제에 대한 유저 리뷰 목록을 가져옵니다.
 */
export async function getUserReviews(subject: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_reviews')
    .select('*, user:profiles(display_name, avatar_url)')
    .eq('subject', subject)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user reviews:', error)
    return []
  }

  return data || []
}
