import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/login/', '/signup/', '/write/'],
    },
    sitemap: 'https://ticgle.kr/sitemap.xml',
    host: 'https://ticgle.kr',
  }
}