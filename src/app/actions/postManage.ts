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

function canModify(role: string, userId: string, authorId: string) {
  if (role === 'admin') return true                                // admin: 모든 글
  if ((role === 'editor' || role === 'user') && userId === authorId) return true // 본인 글
  return false
}

/** 게시물 수정 */
export async function updatePost(postId: string, formData: FormData) {
  const { supabase, user, profile, post, error } = await getProfileAndPost(postId)
  if (error || !user || !profile || !post) redirect('/login')

  if (!canModify(profile.role, user.id, post.author_id)) {
    redirect(`/post/db-${postId}?error=no_permission`)
  }

  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const category = formData.get('category') as string
  const imageUrl = formData.get('imageUrl') as string
  const isEditorsPick = formData.get('isEditorsPick') === 'on'
  
  const reviewSubject = formData.get('reviewSubject') as string
  const reviewRating = parseInt(formData.get('reviewRating') as string) || null
  const reviewComment = formData.get('reviewComment') as string

  const updateData: Record<string, any> = { 
    title, content, category, 
    image_url: imageUrl,
    review_subject: reviewSubject || null,
    review_rating: reviewRating,
    review_comment: reviewComment || null
  }

  // admin만 editors_pick 변경 가능
  if (profile.role === 'admin') {
    updateData.is_editors_pick = isEditorsPick
  }

  const { data: updatedData, error: updateError } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', postId)
    .select()

  if (updateError || !updatedData || updatedData.length === 0) {
    console.error('Update post error (Policy or DB):', updateError)
    redirect(`/post/db-${postId}?error=update_failed_policy`)
  }

  revalidatePath('/', 'layout')
  redirect(`/post/db-${postId}`)
}

/** 게시물 삭제 (admin만 가능) */
export async function deletePost(postId: string) {
  const { supabase, user, profile, post, error } = await getProfileAndPost(postId)
  if (error || !user || !profile || !post) redirect('/login')

  if (!canModify(profile.role, user.id, post.author_id)) {
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

/** 평가 항목 중복 조회를 위한 자동완성 목록용 액션 */
export async function getUniqueReviewSubjects(query: string) {
  if (!query || query.length < 1) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('review_subject')
    .ilike('review_subject', `%${query}%`)
    .not('review_subject', 'is', null)
    .limit(10);

  if (error || !data) return [];
  // 중복 제거 후 반환
  const subjects = data
    .map((d: any) => d.review_subject as string)
    .filter((s, i, arr) => s && arr.indexOf(s) === i);
  return subjects;
}
