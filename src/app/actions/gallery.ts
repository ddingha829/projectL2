'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

async function getLabelsForImages(images: { url: string, title: string, category: string }[]) {
  const supabase = await createClient();
  const imageUrls = images.map(img => img.url);

  // 1. DB에서 이미 존재하는 라벨들을 한꺼번에 가져옵니다 (Bulk DB Check)
  const { data: existingLabels } = await supabase
    .from('gallery_image_labels')
    .select('image_url, labels')
    .in('image_url', imageUrls);

  const labelMap = new Map(existingLabels?.map(l => [l.image_url, l.labels]) || []);
  
  // 2. DB에 없는 신규 이미지 건들만 골라냅니다
  const missingImages = images.filter(img => !labelMap.has(img.url));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return labelMap;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // 3. 신규 이미지들에 대해 병렬로 AI 분석 요청 (Promise.all로 동시 처리)
  // [주의] 무료 티어 레이트 리밋을 고려하여 한 번에 너무 많은 요청은 위험할 수 있으므로 
  // 실제 서비스 시에는 청크 단위 처리가 필요하지만, 현재 수준에선 병렬 처리가 가장 효과적입니다.
  const aiTasks = missingImages.map(async (img) => {
    try {
      const prompt = `이미지("${img.url}") 분석. 제목: "${img.title}", 카테고리: "${img.category}". 핵심 키워드 5개(쉼표 구분). 단답형으로 출력.`;
      const result = await model.generateContent(prompt);
      const labels = (await result.response).text().trim();

      // DB에 저장 (Fire and forget - 기다리지 않고 바로 결과 반환)
      supabase.from('gallery_image_labels').upsert({ image_url: img.url, labels }, { onConflict: 'image_url' }).then();
      
      return { url: img.url, labels };
    } catch (e) {
      return { url: img.url, labels: `${img.category}, ${img.title}` };
    }
  });

  const aiResults = await Promise.all(aiTasks);
  aiResults.forEach(res => labelMap.set(res.url, res.labels));

  return labelMap;
}

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

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, serial_id, title, image_url, content, created_at, author:profiles!author_id(display_name), category')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return []

  const allPendingImages: { url: string, title: string, category: string, post: any, index: number }[] = [];
  
  posts.forEach(post => {
    const postImages = new Set<string>();
    if (post.image_url) postImages.add(post.image_url);
    const contentImages = extractImagesFromHtml(post.content || '');
    contentImages.forEach(url => postImages.add(url));

    Array.from(postImages).forEach((url, index) => {
      allPendingImages.push({ url, title: post.title, category: post.category || '', post, index });
    });
  });

  // [초고속 모드] 일괄 조회 및 병렬 AI 처리
  const labelMap = await getLabelsForImages(allPendingImages);

  const items = allPendingImages.map(img => ({
    id: `${img.post.id}-${img.index}`,
    postId: img.post.id,
    serialId: img.post.serial_id,
    title: img.post.title,
    imageUrl: img.url,
    createdAt: img.post.created_at,
    authorName: (img.post.author as any)?.display_name || '익명 작가',
    labels: `${labelMap.get(img.url) || ''}, ${(img.post.author as any)?.display_name}, ${img.post.title}`
  }));
  
  return shuffleArray(items);
}
