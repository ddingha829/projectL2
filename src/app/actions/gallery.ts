'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// [고도화] 이미지를 가져와서 Gemini용 Base64 데이터로 변환
async function fetchImageAsPart(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return {
      inlineData: {
        data: Buffer.from(buffer).toString("base64"),
        mimeType: "image/jpeg",
      },
    };
  } catch (e) {
    console.error("Fetch failed for AI analysis:", url);
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
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const aiTasks = missingImages.map(async (img) => {
    try {
      const imagePart = await fetchImageAsPart(img.url);
      let result;
      
      if (imagePart) {
        const prompt = "Analyze this image and provide 5 Korean keywords for search labels, separated by commas. (e.g. 풍경, 음식, 도시)";
        result = await model.generateContent([prompt, imagePart]);
      } else {
        const prompt = `Analyze content based on Title: "${img.title}", Category: "${img.category}". Provide 5 Korean keywords for search labels, comma separated.`;
        result = await model.generateContent(prompt);
      }
      
      const labels = (await result.response).text().trim().replace(/[.]/g, ''); 
      
      // DB 영구 저장
      supabase.from('gallery_image_labels').upsert({ image_url: img.url, labels }, { onConflict: 'image_url' }).then();
      
      return { url: img.url, labels };
    } catch (e) {
      console.warn("AI Labeling failed for:", img.url);
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
