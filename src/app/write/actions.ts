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

  // Check if user has writer or admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'writer' && profile.role !== 'admin')) {
    redirect('/write?error=No permission');
  }

  const category = formData.get('category') as string;
  const title = formData.get('title') as string;
  const imageUrl = formData.get('imageUrl') as string;
  const content = formData.get('content') as string;
  const isEditorsPick = formData.get('isEditorsPick') === 'on';

  const { error } = await supabase
    .from('posts')
    .insert([
      {
        author_id: user.id,
        category,
        title,
        image_url: imageUrl,
        content,
        is_editors_pick: isEditorsPick
      }
    ]);

  if (error) {
    console.error('Insert post error:', error);
    redirect('/write?error=Failed processing');
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
