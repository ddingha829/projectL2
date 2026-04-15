'use server'

import { revalidatePath } from 'next/cache'
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

function canModify(role: string | null | undefined, userId: string, authorId: string) {
  // admin은 무조건 통과
  if (role === 'admin') return true;
  
  // 본인 글인 경우 통과 (role이 null이어도 본인글이면 삭제 가능하도록)
  if (userId === authorId) return true;
  
  return false;
}

/** ID 정제: 'db-' 접두어 제거 */
function sanitizePostId(id: string): string {
  if (!id) return id;
  return id.replace(/^db-/, '');
}

/** 게시물 수정 */
export async function updatePost(postId: string, formData: FormData): Promise<{ ok: boolean; redirectTo: string }> {
  const actualId = sanitizePostId(postId);
  const { supabase, user, profile, post, error } = await getProfileAndPost(actualId)
  if (error || !user || !profile || !post) return { ok: false, redirectTo: '/login' }

  if (!canModify(profile.role, user.id, post.author_id)) {
    return { ok: false, redirectTo: `/post/db-${postId}?error=no_permission` }
  }

  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const category = formData.get('category') as string
  const imageUrl = formData.get('imageUrl') as string
  const isEditorsPick = formData.get('isEditorsPick') === 'on'
  const isPublic = formData.get('isPublic') === 'on'
  const isFeature = formData.get('isFeature') === 'on'
  const showMainImage = formData.get('showMainImage') !== 'off'
  
  const reviewSubject = formData.get('reviewSubject') as string
  const reviewRating = parseInt(formData.get('reviewRating') as string) || null
  const reviewComment = formData.get('reviewComment') as string

  const updateData: Record<string, any> = { 
    title, content, category, 
    image_url: imageUrl,
    is_public: isPublic,
    show_main_image: showMainImage,
    review_subject: reviewSubject || null,
    review_rating: reviewRating,
    review_comment: reviewComment || null
  }

  // admin만 editors_pick 및 is_feature 변경 가능
  if (profile.role === 'admin') {
    updateData.is_editors_pick = isEditorsPick
    updateData.is_feature = isFeature || category === 'feature'
  }

  const { data: updatedData, error: updateError } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', postId)
    .select('id, serial_id')
    .single()

  if (updateError || !updatedData) {
    console.error('Update post error (Policy or DB):', updateError)
    return { ok: false, redirectTo: `/post/db-${postId}?error=update_failed_policy` }
  }

  // 수정한 글의 숫자 ID(serial_id)가 있으면 그 주소로, 없으면 UUID 주소로 이동
  const targetId = updatedData.serial_id ? String(updatedData.serial_id) : `db-${updatedData.id}`
  
  // [강력한 갱신] 수정된 글 페이지와 홈, 레이아웃 전체를 새로고침 유도
  revalidatePath(`/post/${targetId}`)
  revalidatePath('/', 'layout')
  
  return { ok: true, redirectTo: `/post/${targetId}` }
}

/** 게시물 삭제 */
export async function deletePost(postId: string): Promise<{ ok: boolean; redirectTo: string }> {
  const actualId = sanitizePostId(postId);
  const { supabase, user, profile, post, error } = await getProfileAndPost(actualId)
  if (error || !user || !profile || !post) {
    console.error('Delete auth/access error:', error);
    return { ok: false, redirectTo: '/login' }
  }

  if (!canModify(profile.role, user.id, post.author_id)) {
    return { ok: false, redirectTo: `/post/db-${postId}?error=no_permission` }
  }

  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (deleteError) {
    console.error('Delete post error:', deleteError)
    return { ok: false, redirectTo: `/post/db-${postId}?error=delete_failed` }
  }

  // 홈화면과 레이아웃 전체 캐시 갱신
  revalidatePath('/', 'layout')
  
  return { ok: true, redirectTo: '/' }
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
