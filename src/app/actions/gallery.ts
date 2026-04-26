'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

async function getLabelsForImages(images: { url: string, title: string, category: string }[]) {
  const supabase = await createClient();
  const imageUrls = images.map(img => img.url);

  let labelMap = new Map();
  try {
    const { data } = await supabase
      .from('gallery_image_labels')
      .select('image_url, labels')
      .in('image_url', imageUrls);
    
    if (data) data.forEach(l => labelMap.set(l.image_url, l.labels));
  } catch (e) {}

  const missingImages = images.filter(img => !labelMap.has(img.url));
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || missingImages.length === 0) return labelMap;

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // [강력 처방] 모델 명어를 가장 안정적인 -latest 접미사가 붙은 것으로 변경
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  const aiTasks = missingImages.map(async (img) => {
    try {
      const imagePart = await fetchImageAsPart(img.url);
      let labels = "";
      
      if (imagePart) {
        const prompt = "Identify 5 descriptive Korean keywords for this image content, separated by commas. Output ONLY the keywords.";
        const result = await model.generateContent([prompt, imagePart]);
        labels = (await result.response).text().trim().replace(/[.]/g, '');
      } else {
        labels = `${img.category}, ${img.title.split(' ').slice(0, 3).join(', ')}`;
      }
      
      // DB 저장
      supabase.from('gallery_image_labels').upsert({ image_url: img.url, labels }, { onConflict: 'image_url' }).then();
      
      return { url: img.url, labels };
    } catch (e: any) {
      // 404 에러 등이 날 경우를 대비한 최후의 보루
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
