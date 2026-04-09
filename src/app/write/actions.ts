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

  try {
    // 1. 프로필 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || (profile.role !== 'editor' && profile.role !== 'admin')) {
      return { success: false, error: '글 작성 권한이 없습니다.' };
    }

    // 2. 폼 데이터 추출 및 검증
    const category = formData.get('category') as string;
    const title = (formData.get('title') as string || '').trim();
    const imageUrl = (formData.get('imageUrl') as string || '').trim();
    const content = (formData.get('content') as string || '').trim();
    const isEditorsPick = formData.get('isEditorsPick') === 'on';
    const isPublic = formData.get('isPublic') === 'on';
    const isFeature = formData.get('isFeature') === 'on';
    const showMainImage = formData.get('showMainImage') !== 'off';

    // [신규] 한줄평 평가 항목
    const reviewSubject = (formData.get('reviewSubject') as string || '').trim();
    const reviewRating = parseInt(formData.get('reviewRating') as string || '0');
    const reviewComment = (formData.get('reviewComment') as string || '').trim();

    if (!title || !content) {
      return { success: false, error: '제목과 내용을 입력해주세요.' };
    }

    // 3. 게시판 타입별 권한 재검증
    if (category === 'notice' && profile.role !== 'admin') {
      return { success: false, error: '공지사항은 관리자만 작성 가능합니다.' };
    }

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
          is_public: isPublic,
          is_feature: isFeature || category === 'feature',
          show_main_image: showMainImage,
          review_subject: reviewSubject || null,
          review_rating: reviewRating || 0,
          review_comment: reviewComment || null
        }
      ]);

    if (error) {
      console.error('Insert post error:', error);
      // throw 대신 리턴하여 redirect 루프 방지 및 명확한 에러 전달
      return { success: false, error: `DB Error: ${error.message}` };
    }

    // 5. 임시저장 데이터 삭제
    await supabase.from('drafts').delete().eq('user_id', user.id);

    revalidatePath('/', 'layout');
    // redirect('/?published=true'); // redirect()는 에러를 던지므로 try-catch 밖에서 처리하는 것이 안전할 수 있음
  } catch (err: any) {
    if (err?.digest?.includes('NEXT_REDIRECT')) throw err;
    console.error('Action unexpected error:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }

  // try-catch 밖에서 최종 리다이렉트
  redirect('/');
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

