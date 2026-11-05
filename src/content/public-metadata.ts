import type { Metadata } from 'next'
import { siteConfig } from '@/config/site'
import type { PublicContentBase } from './public-content-model'

export function createPublicContentMetadata(content: PublicContentBase): Metadata {
  return {
    title: content.metadata.title,
    description: content.metadata.description,
    alternates: { canonical: content.href },
    openGraph: {
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      images: [{ url: '/branding/workmatchr-logo.png', alt: 'WorkMatchr' }],
      title: content.metadata.title,
      description: content.metadata.description,
      url: content.href,
      type: content.type === 'knowledge' ? 'article' : 'website',
    },
  }
}
