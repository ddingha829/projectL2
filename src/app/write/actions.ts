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

  const category = formData.get('category') as string;
  const title = formData.get('title') as string;
  const imageUrl = formData.get('imageUrl') as string;
  const content = formData.get('content') as string;

  const { error } = await supabase
    .from('posts')
    .insert([
      {
        author_id: user.id,
        category,
        title,
        image_url: imageUrl,
        content,
      }
    ]);

  if (error) {
    console.error('Insert post error:', error);
    redirect('/write?error=Failed processing');
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
