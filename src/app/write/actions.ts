'use server'

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. 프로필 권한 확인 (SITE_STANDARDS 준수)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'editor' && profile.role !== 'admin')) {
    redirect('/write?error=No permission');
  }

  // 2. 폼 데이터 추출 및 검증
  const category = formData.get('category') as string;
  const title = (formData.get('title') as string || '').trim();
  const imageUrl = (formData.get('imageUrl') as string || '').trim();
  const content = (formData.get('content') as string || '').trim();
  const isEditorsPick = formData.get('isEditorsPick') === 'on';

  // [신규] 한줄평 평가 항목
  const reviewSubject = (formData.get('reviewSubject') as string || '').trim();
  const reviewRating = parseInt(formData.get('reviewRating') as string || '0');
  const reviewComment = (formData.get('reviewComment') as string || '').trim();

  if (!title || !content) {
    redirect('/write?error=Title and content are required');
  }

  // 3. 게시판 타입별 권한 재검증
  // 공지사항(notice)은 admin만 가능
  if (category === 'notice' && profile.role !== 'admin') {
    redirect('/write?error=Only admin can post notices');
  }

  try {
    // 4. 데이터베이스 저장
    const { error } = await supabase
      .from('posts')
      .insert([
        {
          author_id: user.id,
          category,
          title,
          image_url: imageUrl || 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=1600&q=80',
          content,
          is_editors_pick: isEditorsPick,
          review_subject: reviewSubject || null,
          review_rating: reviewRating || 0,
          review_comment: reviewComment || null
        }
      ]);

    if (error) {
      console.error('Insert post error:', error);
      redirect(`/write?error=${encodeURIComponent(error.message)}`);
    }

    // 5. 임시저장 데이터 삭제
    await supabase.from('drafts').delete().eq('user_id', user.id);

    revalidatePath('/', 'layout');
    redirect('/');
  } catch (err: any) {
    // redirect()는 내부적으로 Next.js 에러를 던지므로 그대로 다시 던져야 작동함
    if (err?.digest?.includes('NEXT_REDIRECT')) throw err;
    
    console.error('Action unexpected error:', err);
    redirect(`/write?error=Unexpected failure: ${encodeURIComponent(err.message || 'Unknown error')}`);
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
  // 중복 제거 후 반환
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
      ...data,
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

