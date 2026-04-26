'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// [고도화] 이미지를 직접 가져와서 Gemini에게 전달하는 함수
async function fetchImageAsPart(url: string) {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return {
      inlineData: {
        data: Buffer.from(buffer).toString("base64"),
        mimeType: "image/jpeg", // 대부분의 업로드 이미지가 jpeg/webp/png
      },
    };
  } catch (e) {
    console.error("Failed to fetch image for AI analysis:", e);
    return null;
  }
}

async function getLabelsForImages(images: { url: string, title: string, category: string }[]) {
  const supabase = await createClient();
  const imageUrls = images.map(img => img.url);

  const { data: existingLabels } = await supabase
    .from('gallery_image_labels')
    .select('image_url, labels')
    .in('image_url', imageUrls);

  const labelMap = new Map(existingLabels?.map(l => [l.image_url, l.labels]) || []);
  const missingImages = images.filter(img => !labelMap.has(img.url));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return labelMap;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const aiTasks = missingImages.map(async (img) => {
    try {
      // [정밀도 향상] 이미지를 직접 가져옵니다
      const imagePart = await fetchImageAsPart(img.url);
      
      let result;
      if (imagePart) {
        // 이미지를 직접 보고 분석 (High Precision)
        const prompt = "이 사진을 보고 검색 키워드로 쓰일 핵심 한국어 단어 5개를 쉼표로 구분해서 말해줘. (예: 풍경, 음식, 도시, 사람, 가구)";
        result = await model.generateContent([prompt, imagePart]);
      } else {
        // 이미지 확보 실패 시 텍스트 기반 추론 (Fallback)
        const prompt = `제목: "${img.title}", 카테고리: "${img.category}". 이 이미지의 내용을 추측해서 핵심 키워드 5개(쉼표 구분)를 알려줘.`;
        result = await model.generateContent(prompt);
      }
      
      const labels = (await result.response).text().trim().replace(/[.]/g, ''); 
      
      // DB 저장 (다음번엔 0.1초 만에 로딩)
      supabase.from('gallery_image_labels').upsert({ image_url: img.url, labels }, { onConflict: 'image_url' }).then();
      
      return { url: img.url, labels };
    } catch (e) {
      console.error("Gemini Error for:", img.url, e);
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

  const allPendingImages: any[] = [];
  posts.forEach(post => {
    const postImages = new Set<string>();
    if (post.image_url) postImages.add(post.image_url);
    const contentImages = extractImagesFromHtml(post.content || '');
    contentImages.forEach(url => postImages.add(url));

    Array.from(postImages).forEach((url, index) => {
      allPendingImages.push({ url, title: post.title, category: post.category || '', post, index });
    });
  });

  const labelMap = await getLabelsForImages(allPendingImages);

  return allPendingImages.map(img => ({
    id: `${img.post.id}-${img.index}`,
    postId: img.post.id,
    serialId: img.post.serial_id,
    title: img.post.title,
    imageUrl: img.url,
    createdAt: img.post.created_at,
    authorName: (img.post.author as any)?.display_name || '익명 작가',
    labels: `${labelMap.get(img.url) || ''}, ${(img.post.author as any)?.display_name}, ${img.post.title}`
  }));
}
