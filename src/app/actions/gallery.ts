'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

// Helper function to extract all image URLs from HTML content
function extractImagesFromHtml(html: string): string[] {
  const images: string[] = [];
  if (!html) return images;

  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) images.push(match[1]);
  }
  return images;
}

// Fisher-Yates Shuffle Algorithm (In-memory, very fast)
function shuffleArray(array: any[]) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * [최적화 로직] 
 * 1. DB에서 게시물을 가져와 이미지 URL만 뽑아내는 무거운 로직은 '캐시' 처리합니다.
 * 2. 캐시된 목록을 메모리상에서 빠르게 섞어 반환하여 서버 트래픽과 CPU 사용량을 줄입니다.
 */
const getCachedGalleryData = unstable_cache(
  async (page: number, limit: number) => {
    const supabase = await createClient()
    const from = page * limit
    const to = from + limit - 1

    const { data, error } = await supabase
      .from('posts')
      .select('id, serial_id, title, image_url, content, created_at, author:profiles!author_id(display_name)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) return []

    const items: any[] = [];
    data.forEach(post => {
      const postImages = new Set<string>();
      if (post.image_url) postImages.add(post.image_url);
      
      const contentImages = extractImagesFromHtml(post.content || '');
      contentImages.forEach(url => postImages.add(url));

      Array.from(postImages).forEach((url, index) => {
        items.push({
          id: `${post.id}-${index}`,
          postId: post.id,
          serialId: post.serial_id,
          title: post.title,
          imageUrl: url,
          createdAt: post.created_at,
          authorName: (post.author as any)?.display_name || '익명 작가'
        });
      });
    });
    
    return items;
  },
  ['gallery-images-key'],
  { revalidate: 3600, tags: ['gallery'] } // 1시간마다 캐시 갱신 또는 'gallery' 태그로 강제 갱신 가능
);

export async function getGalleryImages(page: number = 0, limit: number = 40) {
  // 1. 캐시된 데이터를 먼저 가져옵니다 (서버 부하 절감)
  const items = await getCachedGalleryData(page, limit);
  
  // 2. 메모리상에서 섞어 반환 (CPU 연산 최소화)
  return shuffleArray(items);
}
