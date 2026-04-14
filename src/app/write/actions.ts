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
    const isPublic = formData.get('isPublic') === 'on';
    const isFeature = formData.get('isFeature') === 'on';
    const showMainImage = formData.get('showMainImage') !== 'off';
    const reviewSubject = (formData.get('reviewSubject') as string || '').trim();
    const reviewRating = parseInt(formData.get('reviewRating') as string || '0');
    const reviewComment = (formData.get('reviewComment') as string || '').trim();

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
          review_subject: reviewSubject || null,
          review_rating: reviewRating || 0,
          review_comment: reviewComment || null
        }
      ])
      .select('id')
      .single();

    if (error || !postData) {
      console.error('Insert post error:', error);
      return { error: error ? `Database error: ${error.message}` : 'Failed to create post' };
    }

    await supabase.from('drafts').delete().eq('user_id', user.id);
    revalidatePath('/', 'layout');
    redirect('/');

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
