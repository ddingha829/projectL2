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
          is_editors_pick: isEditorsPick
        }
      ]);

    if (error) {
      console.error('Insert post error:', error);
      redirect(`/write?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath('/', 'layout');
    redirect('/');
  } catch (err: any) {
    // redirect()는 내부적으로 Next.js 에러를 던지므로 그대로 다시 던져야 작동함
    if (err?.digest?.includes('NEXT_REDIRECT')) throw err;
    
    console.error('Action unexpected error:', err);
    redirect(`/write?error=Unexpected failure: ${encodeURIComponent(err.message || 'Unknown error')}`);
  }
}
