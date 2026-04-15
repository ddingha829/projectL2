import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const baseUrl = 'https://ticgle.kr';

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, content, created_at, author:profiles!author_id(display_name)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20);

  const rssItems = (posts || []).map((post) => {
    const description = post.content
      .replace(/<[^>]+>/g, '')
      .substring(0, 200)
      .trim();
    
    const url = `${baseUrl}/post/db-${post.id}`;
    
    const authorName = Array.isArray(post.author) 
      ? post.author[0]?.display_name 
      : (post.author as any)?.display_name;
    
    return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
      <description><![CDATA[${description}]]></description>
      <author><![CDATA[${authorName || '티끌 Ticgle'}]]></author>
    </item>`;
  }).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>티끌 ticgle</title>
    <link>${baseUrl}</link>
    <description>티끌 모아 반짝이는, 일상 매거진</description>
    <language>ko-KR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
}
