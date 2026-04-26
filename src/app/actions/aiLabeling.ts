'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

async function fetchImageAsPart(url: string) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
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

  // [중요] 사용자님이 확인해주신 최신 3.1 모델 명칭 적용
  const candidates = [
    "gemini-3.1-flash-lite-preview", // 최신 정예 모델
    "gemini-1.5-flash"              // 하위 호환성용
  ];

  console.log(`[AI-PreLabel] 3.1 Flash-Lite 모델로 전격 분석 시작 (${imageUrls.length}개)`);

  for (const url of imageUrls) {
    try {
      const { data: existing } = await supabase
        .from('gallery_image_labels')
        .select('labels')
        .eq('image_url', url)
        .maybeSingle();

      if (existing?.labels) continue;

      const imagePart = await fetchImageAsPart(url);
      if (!imagePart) continue;

      let success = false;
      for (const modelName of candidates) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const prompt = "이 사진을 보고 검색용 한국어 키워드 5개를 뽑아줘. 제목/작성자 제외, 보편적 단어 선호 (예: 풍경, 음식, 도시). 쉼표로만 구분.";
          const result = await model.generateContent([prompt, imagePart]);
          const labels = (await result.response).text().trim().replace(/[.]/g, '');

          await supabase.from('gallery_image_labels').upsert({ 
            image_url: url, 
            labels: labels 
          }, { onConflict: 'image_url' });

          console.log(`[AI-PreLabel] ✅ ${modelName} 성공: ${labels}`);
          success = true;
          break; 
        } catch (err: any) {
          if (err.message?.includes('404')) {
            console.warn(`[AI-PreLabel] ${modelName} 모델 404 에러, 다음 후보 시도...`);
            continue;
          }
          throw err;
        }
      }
      
      if (!success) {
        console.error(`[AI-PreLabel] ❌ 모든 모델이 실패했습니다. API 키 권한이나 할당량을 확인해주세요.`);
      }

    } catch (e: any) {
      console.error(`[AI-PreLabel] 분석 중 치명적 에러:`, e.message || e);
    }
  }
}

export async function extractImagesFromHtml(html: string): Promise<string[]> {
  const images: string[] = [];
  if (!html) return images;
  const imgRegex = /<img[^>]+src\s*=\s*['"]([^'"]+)['"]/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) images.push(match[1].trim());
  }
  return images;
}
