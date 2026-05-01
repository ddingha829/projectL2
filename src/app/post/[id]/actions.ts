"use server";

import { createClient } from "@/lib/supabase/server";

export async function getRecommendedPost(currentPostId: string, categoryId: string) {
  const supabase = await createClient();

  // 1단계: 같은 카테고리의 다른 글 찾기
  // categoryId가 한글일 수 있으므로 그대로 쿼리 (DB 구조에 따라 다를 수 있음)
  const { data: categoryPosts } = await supabase
    .from('posts')
    .select('id, serial_id, title, image_url, category, created_at')
    .eq('category', categoryId)
    .eq('is_public', true)
    .neq('id', currentPostId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (categoryPosts && categoryPosts.length > 0) {
    return categoryPosts[0];
  }

  // 2단계: 카테고리가 다를 경우 전체 글 중 최신 글
  const { data: latestPosts } = await supabase
    .from('posts')
    .select('id, serial_id, title, image_url, category, created_at')
    .eq('is_public', true)
    .neq('id', currentPostId)
    .order('created_at', { ascending: false })
    .limit(1);

  return latestPosts?.[0] || null;
}
