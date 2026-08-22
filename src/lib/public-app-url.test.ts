import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { siteConfig } from '@/config/site'
import { getPublicAppBaseUrl } from './public-app-url'

describe('public app-base-URL', () => {
  it('uses the explicitly configured Vercel Preview alias', () => {
    expect(getPublicAppBaseUrl({
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_APP_URL: 'https://platform-finance-preview-workmatchrs-projects.vercel.app',
    })).toBe('https://platform-finance-preview-workmatchrs-projects.vercel.app')
  })

  it('always uses the canonical URL in Production', () => {
    expect(getPublicAppBaseUrl({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://platform-finance-preview-workmatchrs-projects.vercel.app',
    })).toBe(siteConfig.url)
  })

  it.each([
    undefined,
    'http://platform-finance-preview-workmatchrs-projects.vercel.app',
    'https://example.invalid',
    'https://platform-finance-preview-workmatchrs-projects.vercel.app/path',
  ])('falls back safely for an absent or invalid Preview URL: %s', (url) => {
    expect(getPublicAppBaseUrl({ VERCEL_ENV: 'preview', NEXT_PUBLIC_APP_URL: url })).toBe(siteConfig.url)
  })
})
