'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitReviewRequest(writerId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '리뷰 요청을 위해 로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('review_requests')
    .insert({
      writer_id: writerId,
      user_id: user.id,
      content: content.trim(),
      status: 'pending'
    })

  if (error) {
    console.error('Review request error:', error)
    return { success: false, error: '요청 제출 중 오류가 발생했습니다: ' + error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function replyToRequest(requestId: string, reply: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  const isEditor = profile?.role === 'editor';

  if (!isAdmin && !isEditor) {
    return { success: false, error: '답글 작성 권한이 없습니다.' };
  }

  const { error } = await supabase
    .from('review_requests')
    .update({
      reply: reply.trim(),
      replied_at: new Date().toISOString(),
      status: 'completed'
    })
    .eq('id', requestId)

  if (error) {
    return { success: false, error: '답글 등록 중 오류가 발생했습니다: ' + error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getReviewRequests(writerId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('review_requests')
    .select('*, user:profiles!user_id(display_name, avatar_url)')
    .eq('writer_id', writerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch requests error:', error)
    return []
  }

  return data || [];
}

export async function updateRequestStatus(requestId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('review_requests')
    .update({ status })
    .eq('id', requestId)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/', 'layout')
  return { success: true }
}
