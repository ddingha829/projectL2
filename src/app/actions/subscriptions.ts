'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleSubscription(authorId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '구독을 위해 로그인이 필요합니다.' }
  }

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('subscriber_id', user.id)
    .eq('author_id', authorId)
    .single()

  if (existing) {
    // Unsubscribe
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', existing.id)
    
    if (error) return { success: false, error: error.message }
  } else {
    // Subscribe
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        subscriber_id: user.id,
        author_id: authorId
      })
    
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, isSubscribed: !existing }
}

export async function getSubscriptionStatus(authorId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('subscriber_id', user.id)
    .eq('author_id', authorId)
    .single()

  return !!data
}
