'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * [AI 선제 분석 엔진 - 진단 로그 강화형]
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
    if (!response.ok) {
      console.error(`[AI-PreLabel] Fetch Error: ${response.status} for ${url}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    return {
      inlineData: {
        data: Buffer.from(buffer).toString("base64"),
        mimeType: "image/jpeg",
      },
    };
  } catch (e) {
    console.error(`[AI-PreLabel] Network Error during fetch:`, e);
    return null;
  }
}

export async function labelPostImages(postId: string, title: string, category: string, imageUrls: string[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ [AI-PreLabel] GEMINI_API_KEY가 설정되지 않았습니다! .env.local을 확인하세요.");
    return;
  }

  if (imageUrls.length === 0) return;

  const supabase = await createClient();
  const genAI = new GoogleGenerativeAI(apiKey);
  // 가장 최신의 안정된 모델 명칭 사용
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  console.log(`[AI-PreLabel] 분석 시작 (게시물: ${title}, 이미지 ${imageUrls.length}개)`);

  const tasks = imageUrls.map(async (url) => {
    try {
      // 신규 이미지인지 확인
      const { data: existing } = await supabase
        .from('gallery_image_labels')
        .select('labels')
        .eq('image_url', url)
        .maybeSingle();

      if (existing?.labels) {
        console.log(`[AI-PreLabel] 이미 분석된 이미지입니다: ${url.substring(0, 30)}...`);
        return;
      }

      const imagePart = await fetchImageAsPart(url);
      let labels = "";

      if (imagePart) {
        const prompt = "Analyze this image. Output exactly 5 universal Korean search keywords separated by commas (example: 풍경, 음식, 도시). No dots.";
        const result = await model.generateContent([prompt, imagePart]);
        labels = (await result.response).text().trim().replace(/[.]/g, '');
      } else {
        // Fallback: 이미지 분석 실패 시 카테고리와 제목 핵심 키워드 조합
        labels = `${category}, ${title.split(' ').slice(0, 3).join(', ')}`;
      }

      // DB 저장
      const { error: upsertError } = await supabase.from('gallery_image_labels').upsert({ 
        image_url: url, 
        labels: labels 
      }, { onConflict: 'image_url' });

      if (upsertError) {
        console.error(`[AI-PreLabel] DB 저장 실패: ${upsertError.message}`);
      } else {
        console.log(`[AI-PreLabel] 분석 성공 및 저장 완료: ${labels}`);
      }
    } catch (e: any) {
      console.error(`[AI-PreLabel] Gemini 분석 에러:`, e?.message || e);
    }
  });

  await Promise.all(tasks);
}

/** HTML에서 이미지 URL 추출 유틸리티 (Async) */
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
