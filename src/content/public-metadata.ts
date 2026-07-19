import type { Metadata } from 'next'
import type { PublicContentBase } from './public-content-model'

export function createPublicContentMetadata(content: PublicContentBase): Metadata {
  return {
    title: content.metadata.title,
    description: content.metadata.description,
    alternates: { canonical: content.href },
    openGraph: {
      title: content.metadata.title,
      description: content.metadata.description,
      url: content.href,
      type: content.type === 'knowledge' ? 'article' : 'website',
    },
  }
}
