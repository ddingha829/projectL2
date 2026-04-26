'use server'

import { createClient } from '@/lib/supabase/server'

// Helper function to extract all image URLs from TipTap JSON content
function extractImagesFromContent(content: any): string[] {
  const images: string[] = [];
  
  if (!content) return images;

  // content가 문자열인 경우 JSON 파싱 시도
  let jsonData = content;
  if (typeof content === 'string') {
    try {
      jsonData = JSON.parse(content);
    } catch (e) {
      return images;
    }
  }

  const traverse = (node: any) => {
    if (node.type === 'image' && node.attrs?.src) {
      images.push(node.attrs.src);
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  };

  if (jsonData.content && Array.isArray(jsonData.content)) {
    jsonData.content.forEach(traverse);
  }

  return images;
}

export async function getGalleryImages(page: number = 0, limit: number = 40) {
  const supabase = await createClient()
  
  // 모든 이미지를 가져오기 위해 게시물을 충분히 가져옵니다.
  const from = page * limit
  const to = from + limit - 1

  const { data, error } = await supabase
    .from('posts')
    .select('id, serial_id, title, image_url, content, created_at, author:profiles!author_id(display_name)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Fetch gallery error:', error)
    return []
  }

  const allGalleryItems: any[] = [];

  data.forEach(post => {
    // 1. 대표 이미지 추가
    if (post.image_url) {
      allGalleryItems.push({
        id: `${post.id}-main`,
        postId: post.id,
        serialId: post.serial_id,
        title: post.title,
        imageUrl: post.image_url,
        createdAt: post.created_at,
        authorName: (post.author as any)?.display_name || '익명 작가'
      });
    }

    // 2. 본문 이미지 추출 및 추가
    const contentImages = extractImagesFromContent(post.content);
    contentImages.forEach((url, index) => {
      // 대표 이미지와 같은 URL이면 중복 패스
      if (url === post.image_url) return;
      
      allGalleryItems.push({
        id: `${post.id}-content-${index}`,
        postId: post.id,
        serialId: post.serial_id,
        title: post.title,
        imageUrl: url,
        createdAt: post.created_at,
        authorName: (post.author as any)?.display_name || '익명 작가'
      });
    });
  });

  return allGalleryItems;
}
