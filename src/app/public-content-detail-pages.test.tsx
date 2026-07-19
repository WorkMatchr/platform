import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { KnowledgeArticlePage } from '@/components/public/knowledge-article-page'
import { ObligationDetailPage } from '@/components/public/obligation-detail-page'
import { SectorDetailPage } from '@/components/public/sector-detail-page'
import { ServiceDetailPage } from '@/components/public/service-detail-page'
import { knowledgeArticles } from '@/content/knowledge/articles'
import { obligations } from '@/content/obligations'
import { createPublicContentMetadata } from '@/content/public-metadata'
import { sectors } from '@/content/sectors'
import { services } from '@/content/services'

const renderedPages = [
  ...services.map((content) => ({ content, html: renderToStaticMarkup(<ServiceDetailPage content={content} />) })),
  ...obligations.map((content) => ({ content, html: renderToStaticMarkup(<ObligationDetailPage content={content} />) })),
  ...sectors.map((content) => ({ content, html: renderToStaticMarkup(<SectorDetailPage content={content} />) })),
  ...knowledgeArticles.map((content) => ({ content, html: renderToStaticMarkup(<KnowledgeArticlePage content={content} />) })),
]

describe('Publieke detailpagina-contracten', () => {
  it.each(renderedPages)('$content.href heeft één H1, breadcrumbs, bronnen en gerichte vervolgstappen', ({ html }) => {
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html).toContain('break-words')
    expect(html).toContain('aria-label="Broodkruimelpad"')
    expect(html).toContain('Bronnen en onderbouwing')
    expect(html).toContain('href="/advieswijzer"')
    expect(html).not.toContain('href="#"')
  })

  it.each(renderedPages)('$content.href heeft unieke canonieke en Open Graph-metadata', ({ content }) => {
    const metadata = createPublicContentMetadata(content)

    expect(metadata.title).toBe(content.metadata.title)
    expect(metadata.description).toBe(content.metadata.description)
    expect(metadata.alternates?.canonical).toBe(content.href)
    expect(metadata.openGraph).toMatchObject({
      title: content.metadata.title,
      description: content.metadata.description,
      url: content.href,
    })
  })
})
