import type { MetadataRoute } from 'next'
import { siteConfig } from '@/config/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/account',
        '/account-activeren',
        '/adviesdossiers',
        '/aanbiedersdossier',
        '/api/',
        '/dashboard',
        '/hulpvragen',
        '/inloggen',
        '/organisatie',
        '/opdrachten',
        '/registreren',
        '/wachtwoord-vergeten',
        '/wachtwoord-instellen',
      ],
    },
    sitemap: new URL('/sitemap.xml', siteConfig.url).toString(),
  }
}
