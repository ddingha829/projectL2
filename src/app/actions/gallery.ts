'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * [영구 저장 로직]
 * 1. DB(gallery_image_labels)에서 라벨 조회
 * 2. 없으면 Gemini 호출 후 DB에 저장
 * 3. 있으면 그대로 반환
 */
async function getOrGenerateLabels(imageUrl: string, title: string, category: string): Promise<string> {
  const supabase = await createClient();
  
  // 1. DB에서 먼저 확인
  try {
    const { data: existing } = await supabase
      .from('gallery_image_labels')
      .select('labels')
      .eq('image_url', imageUrl)
      .single();

    if (existing?.labels) return existing.labels;
  } catch (e) {
    // 테이블이 없거나 조회 실패 시 AI 호출로 이행
  }

  // 2. DB에 없으면 Gemini 호출
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return `${category}, ${title}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // 이미지 컨텍스트와 함께 키워드 요청
    const prompt = `이미지("${imageUrl}")의 분위기와 내용을 분석해주세요. 제목: "${title}", 카테고리: "${category}". 관련 있는 한국어 핵심 키워드 5개를 쉼표로만 구분해서 답해주세요.`;
    const result = await model.generateContent(prompt);
    const labels = (await result.response).text().trim();

    // 3. 분석된 라벨을 DB에 영구 저장 (다음번엔 AI 호출 안 함)
    await supabase
      .from('gallery_image_labels')
      .upsert({ image_url: imageUrl, labels: labels }, { onConflict: 'image_url' });

    return labels;
  } catch (e) {
    console.warn("AI Labeling failed, falling back to manual labels");
    return `${category}, ${title}`;
  }
}

// HTML 추출 로직 (Quill)
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

  // 1. 게시물 목록 조회
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, serial_id, title, image_url, content, created_at, author:profiles!author_id(display_name), category')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return []

  const items: any[] = [];
  
  for (const post of posts) {
    const postImages = new Set<string>();
    if (post.image_url) postImages.add(post.image_url);
    const contentImages = extractImagesFromHtml(post.content || '');
    contentImages.forEach(url => postImages.add(url));

    const imageUrls = Array.from(postImages);
    
    for (let index = 0; index < imageUrls.length; index++) {
      const url = imageUrls[index];
      
      // [핵심] DB를 먼저 뒤지고, 없으면 Gemini 한 번만 호출!
      const aiLabels = await getOrGenerateLabels(url, post.title, post.category || '');

      items.push({
        id: `${post.id}-${index}`,
        postId: post.id,
        serialId: post.serial_id,
        title: post.title,
        imageUrl: url,
        createdAt: post.created_at,
        authorName: (post.author as any)?.display_name || '익명 작가',
        labels: `${aiLabels}, ${(post.author as any)?.display_name}, ${post.title}` 
      });
    }
  }
  
  return shuffleArray(items);
}
