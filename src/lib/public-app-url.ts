import 'server-only'

import { siteConfig } from '@/config/site'

type PublicAppUrlEnvironment = {
  VERCEL_ENV?: string
  NEXT_PUBLIC_APP_URL?: string
}

function validPreviewUrl(value: string | undefined) {
  if (!value) return null

  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      !url.hostname.endsWith('.vercel.app')
    ) {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

/**
 * Resolves the public origin for server-generated links without trusting an
 * incoming request host. Production is always canonical; Preview accepts only
 * an explicitly configured HTTPS Vercel alias.
 */
export function getPublicAppBaseUrl(environment: PublicAppUrlEnvironment = {
  VERCEL_ENV: process.env.VERCEL_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}) {
  if (environment.VERCEL_ENV === 'production') return siteConfig.url

  if (environment.VERCEL_ENV === 'preview') {
    return validPreviewUrl(environment.NEXT_PUBLIC_APP_URL) ?? siteConfig.url
  }

  return siteConfig.url
}
