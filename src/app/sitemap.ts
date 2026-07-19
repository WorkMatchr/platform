import type { MetadataRoute } from 'next'
import { siteConfig } from '@/config/site'
import { indexablePublicRoutes } from '@/content/public-routes'

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePublicRoutes.map((route) => ({
    url: new URL(route, siteConfig.url).toString(),
  }))
}
