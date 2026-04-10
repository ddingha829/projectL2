import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/login/', '/write/'],
    },
    sitemap: 'https://project-l2.vercel.app/sitemap.xml',
  }
}