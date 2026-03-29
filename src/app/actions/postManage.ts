'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function getProfileAndPost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' as const, supabase, user: null, profile: null, post: null }

  const [{ data: profile }, { data: post }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('posts').select('id, author_id').eq('id', postId).single(),
  ])

  return { supabase, user, profile, post, error: null }
}

function canEdit(role: string, userId: string, authorId: string) {
  if (role === 'admin') return true               // admin: 모든 글
  if (role === 'editor' && userId === authorId) return true  // editor: 본인 글만
  return false
}

/** 게시물 수정 */
export async function updatePost(postId: string, formData: FormData) {
  const { supabase, user, profile, post, error } = await getProfileAndPost(postId)
  if (error || !user || !profile || !post) redirect('/login')

  if (!canEdit(profile.role, user.id, post.author_id)) {
    redirect(`/post/db-${postId}?error=no_permission`)
  }

  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const category = formData.get('category') as string
  const imageUrl = formData.get('imageUrl') as string
  const isEditorsPick = formData.get('isEditorsPick') === 'on'

  const updateData: Record<string, any> = { title, content, category, image_url: imageUrl }

  // admin만 editors_pick 변경 가능
  if (profile.role === 'admin') {
    updateData.is_editors_pick = isEditorsPick
  }

  const { error: updateError } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', postId)

  if (updateError) {
    console.error('Update post error:', updateError)
    redirect(`/post/db-${postId}?error=update_failed`)
  }

  revalidatePath('/', 'layout')
  redirect(`/post/db-${postId}`)
}

/** 게시물 삭제 (admin만 가능) */
export async function deletePost(postId: string) {
  const { supabase, user, profile, error } = await getProfileAndPost(postId)
  if (error || !user || !profile) redirect('/login')

  if (profile.role !== 'admin') {
    redirect(`/post/db-${postId}?error=no_permission`)
  }

  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (deleteError) {
    console.error('Delete post error:', deleteError)
    redirect(`/post/db-${postId}?error=delete_failed`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
