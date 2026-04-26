'use server'

import { createClient } from '@/lib/supabase/server'

// HTML에서 이미지 URL을 추출하는 최소한의 유틸리티 (AI 의존성 제거)
function extractImagesSync(html: string): string[] {
  const images: string[] = [];
  if (!html) return images;
  const imgRegex = /<img[^>]+src\s*=\s*['"]([^'"]+)['"]/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) images.push(match[1].trim());
  }
  return images;
}

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

  // 1. 게시물 조회 (카테고리 포함)
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, serial_id, title, image_url, content, created_at, author:profiles!author_id(display_name), category')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error || !posts) return []

  const items: any[] = [];
  for (const post of posts) {
    const postImages = new Set<string>();
    if (post.image_url) postImages.add(post.image_url);
    
    // 본문 이미지 추출
    const contentImgs = extractImagesSync(post.content || '');
    contentImgs.forEach(url => postImages.add(url));

    const authorName = (post.author as any)?.display_name || '익명 작가';
    const category = post.category || '기타';

    Array.from(postImages).forEach((url, index) => {
      items.push({
        id: `${post.id}-${index}`,
        postId: post.id,
        serialId: post.serial_id,
        title: post.title,
        imageUrl: url,
        createdAt: post.created_at,
        authorName: authorName,
        category: category,
        // 제목, 작성자, 카테고리를 합쳐서 검색용 문자열 생성
        searchTerms: `${post.title} ${authorName} ${category}`.toLowerCase().normalize('NFC')
      });
    });
  }
  
  return shuffleArray(items);
}
