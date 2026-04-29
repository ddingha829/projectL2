import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 3600; // 1시간마다 갱신

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ticgle.kr'
  const supabase = await createClient()

  // 1. Fetch all DB posts
  const { data: dbPosts } = await supabase
    .from('posts')
    .select('id, serial_id, created_at')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  // 2. Map DB posts to sitemap entries
  const postEntries = (dbPosts || []).map((post) => ({
    url: `${baseUrl}/post/${post.serial_id ? post.serial_id : `db-${post.id}`}`,
    lastModified: new Date(post.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // 3. Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/notice`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/reviews`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.1,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.1,
    },
  ]

  return [...staticPages, ...postEntries]
}
