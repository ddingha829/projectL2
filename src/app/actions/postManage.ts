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
  // admin은 무조건 통과 (대소문자 무시)
  const normalizedRole = role?.toLowerCase()?.trim();
  if (normalizedRole === 'admin') return true;
  
  // 본인 글인 경우 통과
  if (userId && authorId && userId === authorId) return true;
  
  return false;
}

/** ID 정제: 'db-' 접두어 제거 */
function sanitizePostId(id: string): string {
  if (!id) return id;
  return id.replace(/^db-/, '');
}

/** 게시물 수정 */
export async function updatePost(postId: string, formData: FormData): Promise<{ ok: boolean; redirectTo: string; targetId?: string }> {
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
  
  let reviewSubject = formData.get('reviewSubject') as string
  let reviewRating = parseInt(formData.get('reviewRating') as string) || 0
  let reviewComment = formData.get('reviewComment') as string

  // 속성 추출 헬퍼 (공통)
  const getAttr = (tagText: string, attr: string) => {
    // 1. 큰따옴표로 감싸진 경우
    let res = tagText.match(new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i'));
    // 2. 작은따옴표로 감싸진 경우
    if (!res) res = tagText.match(new RegExp(`${attr}\\s*=\\s*'([^']*)'`, 'i'));
    // 3. 따옴표가 없는 경우 (공백 전까지)
    if (!res) res = tagText.match(new RegExp(`${attr}\\s*=\\s*([^\\s>]+)`, 'i'));
    
    if (res && res[1]) {
      return res[1]
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    }
    return null;
  };

  // [Plan C] 다중 리뷰 전수 추출 및 저장 준비
  const cardRegex = /<div[^>]*class="[^"]*ql-review-card[^"]*"[^>]*>/gi;
  const matches = Array.from(content.matchAll(cardRegex));
  
  if (matches.length > 0) {
    // 첫 번째 카드를 대표 리뷰로 설정 (하향 호환성 유지)
    const firstTag = matches[0][0];
    const extractedName = getAttr(firstTag, 'data-place-name');
    const extractedRating = getAttr(firstTag, 'data-rating');
    const extractedComment = getAttr(firstTag, 'data-comment');

    if (extractedName) reviewSubject = extractedName.trim();
    if (extractedRating) reviewRating = Math.round(parseFloat(extractedRating || '0') * 2);
    if (extractedComment) reviewComment = extractedComment.trim();
  }

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

  try {
    const { data: updatedData, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', actualId)
      .select('id, serial_id')
      .single()

    if (updateError || !updatedData) {
      console.error('Update post error (Policy or DB):', JSON.stringify(updateError))
      return { ok: false, redirectTo: `/post/db-${postId}?error=update_failed_db` }
    }

  // [Plan C] 다중 리뷰 동기화 (기존 데이터 삭제 후 재삽입)
  const { error: delError } = await supabase.from('post_reviews').delete().eq('post_id', actualId);
  if (delError) console.error('Delete reviews error:', delError);
  
  if (matches.length > 0) {
    const reviewEntries = matches.map(match => {
      const tag = match[0];
      const subj = getAttr(tag, 'data-place-name');
      const rate = getAttr(tag, 'data-rating');
      const comm = getAttr(tag, 'data-comment');
      const lat = getAttr(tag, 'data-lat');
      const lng = getAttr(tag, 'data-lng');
      const emb = getAttr(tag, 'data-embed-url');
      const pId = getAttr(tag, 'data-place-id');
      
      if (!subj) return null;
      return {
        post_id: actualId,
        subject: subj.trim(),
        rating: parseFloat(rate || '0'),
        comment: comm?.trim() || '',
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        embed_url: emb || null,
        place_id: pId || null
      };
    }).filter((entry): entry is any => entry !== null);

    if (reviewEntries.length > 0) {
      const { error: insError } = await supabase.from('post_reviews').insert(reviewEntries);
      if (insError) console.error('Insert reviews error:', insError);
    }
  }

    // 수정한 글의 숫자 ID(serial_id)가 있으면 그 주소로, 없으면 UUID 주소로 이동
    const targetId = updatedData.serial_id ? String(updatedData.serial_id) : `db-${updatedData.id}`
    
    // [강력한 갱신] 수정된 글 페이지와 홈, 레이아웃 전체를 새로고침 유도
    revalidatePath(`/post/${targetId}`)
    revalidatePath('/', 'layout')
    
    return { ok: true, redirectTo: `/post/${targetId}`, targetId }
  } catch (sysErr) {
    console.error('System error during updatePost:', sysErr);
    return { ok: false, redirectTo: `/post/db-${postId}?error=system_error` }
  }
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
