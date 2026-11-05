import type { MetadataRoute } from 'next'
import { siteConfig } from '@/config/site'

export default function robots(): MetadataRoute.Robots {
  // Let crawlers read noindex headers. Disallow alone cannot prevent indexing.
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: new URL('/sitemap.xml', siteConfig.url).toString() }
}
