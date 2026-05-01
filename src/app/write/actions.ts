'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated', reauth: true };
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || (profile.role !== 'editor' && profile.role !== 'admin')) {
      return { error: 'Permission denied. You must be an editor or admin.' };
    }

    const category = formData.get('category') as string;
    const title = (formData.get('title') as string || '').trim();
    const imageUrl = (formData.get('imageUrl') as string || '').trim();
    const content = (formData.get('content') as string || '').trim();
    const isEditorsPick = formData.get('isEditorsPick') === 'on';
    const isPrivate = formData.get('isPrivate') === 'on';
    const isPublic = !isPrivate; 
    const isFeature = formData.get('isFeature') === 'on';
    const showMainImage = formData.get('showMainImage') !== 'off';
    const trivia = (formData.get('trivia') as string || '').trim();
    let reviewSubject = (formData.get('reviewSubject') as string || '').trim();
    let reviewRating = parseInt(formData.get('reviewRating') as string || '0');
    let reviewComment = (formData.get('reviewComment') as string || '').trim();

    const getAttr = (tagText: string, attr: string) => {
      // 1. 큰따옴표로 감싸진 경우
      let res = tagText.match(new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i'));
      // 2. 작은따옴표로 감싸진 경우
      if (!res) res = tagText.match(new RegExp(`${attr}\\s*=\\s*'([^']*)'`, 'i'));
      // 3. 따옴표가 없는 경우 (공백 전까지)
      if (!res) res = tagText.match(new RegExp(`${attr}\\s*=\\s*([^\\s>]+)`, 'i'));
      
      if (res && res[1]) {
        // HTML 엔티티 복원 (가장 빈번한 순서대로)
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
      const firstTag = matches[0][0];
      const extractedName = getAttr(firstTag, 'data-place-name');
      const extractedRating = getAttr(firstTag, 'data-rating');
      const extractedComment = getAttr(firstTag, 'data-comment');

      if (extractedName) reviewSubject = extractedName.trim();
      if (extractedRating) reviewRating = Math.round(parseFloat(extractedRating) * 2);
      if (extractedComment) reviewComment = extractedComment.trim();
    }

    if (!title || !content) {
      return { error: 'Title and content are required.' };
    }

    if (category === 'notice' && profile.role !== 'admin') {
      return { error: 'Only admins can post notices.' };
    }

    const { data: postData, error } = await supabase
      .from('posts')
      .insert([
        {
          author_id: user.id,
          category,
          title,
          image_url: imageUrl || 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=1600&q=80',
          content,
          is_editors_pick: isEditorsPick,
          is_public: isPublic,
          is_feature: isFeature || category === 'feature',
          show_main_image: showMainImage,
          trivia: trivia || null,
          review_subject: reviewSubject || null,
          review_rating: reviewRating || 0,
          review_comment: reviewComment || null
        }
      ])
      .select('id, serial_id')
      .single();

    if (error || !postData) {
      console.error('Insert post error:', error);
      return { error: error ? `Database error: ${error.message}` : 'Failed to create post' };
    }

    // [Plan C] 다중 리뷰 전수 추출 및 저장
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
        const addr = getAttr(tag, 'data-address');
        const cat = getAttr(tag, 'data-category');
        
        if (!subj) return null;
        return {
          post_id: postData.id,
          subject: subj.trim(),
          rating: parseFloat(rate || '0'),
          comment: comm?.trim() || '',
          lat: lat ? parseFloat(lat) : null,
          lng: lng ? parseFloat(lng) : null,
          embed_url: emb || null,
          place_id: pId || null,
          address: addr || null,
          category: cat || null
        };
      }).filter((entry): entry is any => entry !== null);

      if (reviewEntries.length > 0) {
        const { error: insError } = await supabase.from('post_reviews').insert(reviewEntries);
        if (insError) console.error('Archive sync insertion error:', insError);
      }
    }

    await supabase.from('drafts').delete().eq('user_id', user.id);
    revalidatePath('/', 'layout');
    
    const targetId = postData.serial_id ? String(postData.serial_id) : `db-${postData.id}`;
    return { success: true, targetId }; // redirect 대신 성공 결과 반환

  } catch (err: any) {
    if (err.digest?.startsWith('NEXT_REDIRECT')) throw err;
    console.error('Action unexpected error:', err);
    return { error: `An unexpected error occurred: ${err.message || 'Unknown error'}` };
  }
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
  const subjects = data
    .map((d: any) => d.review_subject as string)
    .filter((s, i, arr) => s && arr.indexOf(s) === i);
  return subjects;
}

/** 임시저장 기능 */
export async function saveDraft(data: {
  category: string;
  title: string;
  imageUrl: string;
  content: string;
  isEditorsPick: boolean;
  isPublic: boolean;
  isFeature: boolean;
  showMainImage: boolean;
  trivia?: string;
  reviewSubject?: string;
  reviewRating?: number;
  reviewComment?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('drafts')
    .upsert({
      user_id: user.id,
      category: data.category,
      title: data.title,
      image_url: data.imageUrl,
      content: data.content,
      is_editors_pick: data.isEditorsPick,
      is_public: data.isPublic,
      is_feature: data.isFeature,
      show_main_image: data.showMainImage,
      trivia: data.trivia || null,
      review_subject: data.reviewSubject || null,
      review_rating: data.reviewRating || 0,
      review_comment: data.reviewComment || null,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Save draft error:', error);
    return { error: error.message };
  }
  return { success: true };
}

/** 임시저장 불러오기 */
export async function getDraft() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) return null;
  return data;
}

/** 임시저장 데이터 완전 삭제 */
export async function deleteDraft() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('drafts')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Delete draft error:', error);
    return { error: error.message };
  }
  return { success: true };
}
