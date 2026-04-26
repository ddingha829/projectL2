'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// [정교화] 이미지 분석 실패 원인을 파악할 수 있는 정밀 Fetch 함수
async function fetchImageAsPart(url: string) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 3600 }
    });
    
    if (!response.ok) {
      console.error(`[AI] Image Fetch Failed: ${response.status} ${response.statusText} for ${url}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      console.error(`[AI] Empty Image Buffer: ${url}`);
      return null;
    }

    return {
      inlineData: {
        data: Buffer.from(buffer).toString("base64"),
        mimeType: "image/jpeg",
      },
    };
  } catch (e) {
    console.error(`[AI] Network Error during fetch: ${e} for ${url}`);
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
  if (!apiKey || missingImages.length === 0) return labelMap;

  const genAI = new GoogleGenerativeAI(apiKey);
  // [모델 최적화] 안정성을 위해 gemini-1.5-flash-latest 사용 권장
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const aiTasks = missingImages.map(async (img) => {
    try {
      const imagePart = await fetchImageAsPart(img.url);
      let result;
      
      if (imagePart) {
        const prompt = "Please analyze this image and output 5 Korean search keywords (comma-separated, no dots). focus on landscape, subject, or mood.";
        result = await model.generateContent([prompt, imagePart]);
      } else {
        const prompt = `Title: "${img.title}", Category: "${img.category}". Guess 5 Korean search keywords based on this info (comma-separated).`;
        result = await model.generateContent(prompt);
      }
      
      const response = await result.response;
      const labels = response.text().trim().replace(/[.]/g, ''); 
      
      // DB 영구 저장 (오류 시에도 무결성 유지)
      const { error: upsertError } = await supabase
        .from('gallery_image_labels')
        .upsert({ image_url: img.url, labels }, { onConflict: 'image_url' });
      
      if (upsertError) console.error("[AI] DB Upsert Error:", upsertError.message);
      
      return { url: img.url, labels };
    } catch (e: any) {
      // 구체적인 에러 내용 출력
      console.warn(`[AI] GEMINI Analysis Failed for ${img.url}: ${e?.message || e}`);
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
