'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated', user: null, supabase }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'forbidden', user, supabase }
  return { supabase, user, role: profile.role }
}

export async function deletePostAdmin(postId: string) {
  const { supabase, error } = await checkAdmin()
  if (error) return { success: false, error }

  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (deleteError) return { success: false, error: deleteError.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function updateUserRole(userId: string, newRole: 'user' | 'editor' | 'admin') {
  const { supabase, error } = await checkAdmin()
  if (error) return { success: false, error }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (updateError) return { success: false, error: updateError.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function toggleEditorsPick(postId: string, currentStatus: boolean) {
  const { supabase, error } = await checkAdmin()
  if (error) return { success: false, error }

  const { error: updateError } = await supabase
    .from('posts')
    .update({ is_editors_pick: !currentStatus })
    .eq('id', postId)

  if (updateError) return { success: false, error: updateError.message }
  revalidatePath('/admin')
  return { success: true }
}
