'use server'

import { createClient } from '@/lib/supabase/server'

/** 카테고리 한글 매핑 테이블 */
const CATEGORY_MAP: Record<string, string> = {
  movie: '영화',
  book: '책',
  game: '게임',
  restaurant: '맛집',
  travel: '여행',
  exhibition: '전시회',
  other: '기타',
  feature: '기획전',
  notice: '공지사항'
};

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
    
    const contentImgs = extractImagesSync(post.content || '');
    contentImgs.forEach(url => postImages.add(url));

    const authorName = (post.author as any)?.display_name || '익명 작가';
    const categoryKey = post.category || 'other';
    const categoryName = CATEGORY_MAP[categoryKey] || categoryKey;

    Array.from(postImages).forEach((url, index) => {
      items.push({
        id: `${post.id}-${index}`,
        postId: post.id,
        serialId: post.serial_id,
        title: (post.title || '').normalize('NFC'),
        imageUrl: url,
        createdAt: post.created_at,
        authorName: authorName.normalize('NFC'),
        category: categoryName.normalize('NFC'),
        // [강력 보강] 제목, 작가, 카테고리(한글/영어 모두) 통합 검색 필드
        searchTerms: `[${categoryName}] [${categoryKey}] ${post.title} ${authorName}`.toLowerCase().normalize('NFC')
      });
    });
  }
  
  return shuffleArray(items);
}
