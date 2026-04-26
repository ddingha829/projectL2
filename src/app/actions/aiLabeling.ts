'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * [AI 선제 분석 엔진]
 * 게시물 업로드 시점에 호출되어 이미지를 미리 분석하고 DB에 저장합니다.
 */
async function fetchImageAsPart(url: string) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return {
      inlineData: {
        data: Buffer.from(buffer).toString("base64"),
        mimeType: "image/jpeg",
      },
    };
  } catch (e) {
    return null;
  }
}

export async function labelPostImages(postId: string, title: string, category: string, imageUrls: string[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || imageUrls.length === 0) return;

  const supabase = await createClient();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  console.log(`[AI-PreLabel] Analyzing ${imageUrls.length} images for post: ${title}`);

  const tasks = imageUrls.map(async (url) => {
    try {
      // 1. 이미 DB에 있는지 확인 (중복 분석 방지)
      const { data: existing } = await supabase
        .from('gallery_image_labels')
        .select('labels')
        .eq('image_url', url)
        .maybeSingle();

      if (existing) return;

      // 2. 없으면 AI 분석
      const imagePart = await fetchImageAsPart(url);
      let labels = "";

      if (imagePart) {
        const prompt = "이 사진을 보고 검색용 한국어 키워드 5개를 뽑아줘. 제목이나 작성자 이름은 제외하고, 사진에 나타난 사물, 배경, 분위기를 중심으로 '풍경, 음식, 식당, 제품, 인물, 도시'와 같이 보편적인 검색어 5개를 쉼표로만 구분해줘.";
        const result = await model.generateContent([prompt, imagePart]);
        labels = (await result.response).text().trim().replace(/[.]/g, '');
      } else {
        // Fallback: 이미지 분석 실패 시 카테고리와 제목 핵심 키워드 조합
        labels = `${category}, ${title.split(' ').slice(0, 3).join(', ')}`;
      }

      // 3. DB 저장
      await supabase.from('gallery_image_labels').upsert({ 
        image_url: url, 
        labels: labels 
      }, { onConflict: 'image_url' });

      console.log(`[AI-PreLabel] Success: ${url.substring(0, 30)}...`);
    } catch (e) {
      console.error(`[AI-PreLabel] Failed for ${url}:`, e);
    }
  });

  // 게시물 업로드를 방해하지 않기 위해 병렬로 실행하되, 
  // 호출한 쪽에서 원하면 await 할 수 있도록 Promise.all 사용
  await Promise.all(tasks);
}

/** HTML에서 이미지 URL 추출 유틸리티 */
export async function extractImagesFromHtml(html: string): Promise<string[]> {
  const images: string[] = [];
  if (!html) return images;
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) images.push(match[1]);
  }
  return images;
}
