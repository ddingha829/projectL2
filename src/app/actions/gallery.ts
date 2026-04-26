'use server'

import { createClient } from '@/lib/supabase/server'
import { extractImagesFromHtml } from './aiLabeling'

function shuffleArray(array: any[]) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export async function getGalleryImages(page: number = 0, limit: number = 40) {
  const supabase = await createClient()
  const from = page * limit
  const to = from + limit - 1

  // 1. 게시물 조회
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, serial_id, title, image_url, content, created_at, author:profiles!author_id(display_name), category')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error || !posts) return []

  const imageUrls: string[] = [];
  for (const post of posts) {
    if (post.image_url) imageUrls.push(post.image_url);
    const contentImgs = await extractImagesFromHtml(post.content || '');
    contentImgs.forEach(url => imageUrls.push(url));
  }

  // 2. 미리 저장된 라벨들 일괄 조회
  const { data: labelsData } = await supabase
    .from('gallery_image_labels')
    .select('image_url, labels')
    .in('image_url', imageUrls);

  const labelMap = new Map(labelsData?.map(l => [l.image_url, l.labels]) || []);

  const items: any[] = [];
  for (const post of posts) {
    const postImages = new Set<string>();
    if (post.image_url) postImages.add(post.image_url);
    const contentImgs = await extractImagesFromHtml(post.content || '');
    contentImgs.forEach(url => postImages.add(url));

    Array.from(postImages).forEach((url, index) => {
      items.push({
        id: `${post.id}-${index}`,
        postId: post.id,
        serialId: post.serial_id,
        title: (post.title || '').normalize('NFC'),
        imageUrl: url,
        createdAt: post.created_at,
        authorName: ((post.author as any)?.display_name || '익명 작가').normalize('NFC'),
        // 라벨이 없으면 기본 정보라도 검색에 걸리도록 구성
        labels: `${(labelMap.get(url) || '').normalize('NFC')}, ${((post.author as any)?.display_name || '').normalize('NFC')}, ${(post.title || '').normalize('NFC')}`
      });
    });
  }
  
  return shuffleArray(items);
}
