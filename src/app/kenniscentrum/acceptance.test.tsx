import { renderToStaticMarkup as render } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Page, { metadata } from './page'
import { KnowledgeArticlePage } from '@/components/public/knowledge-article-page'
import { knowledgeArticles } from '@/content/knowledge/articles'
import { createPublicContentMetadata } from '@/content/public-metadata'
import { knowledgeCategories } from '@/content/public-overviews'
import { resolvePublicSources } from '@/content/public-sources'
import sitemap from '../sitemap'

describe('A05 kennisacceptatie', () => {
  it('maakt alle negen artikelen bereikbaar, behoudt vijf informatieve rubrieken en één opdrachtstart', () => {
    const html = render(<Page />)
    expect(knowledgeArticles).toHaveLength(9)
    expect(new Set(knowledgeArticles.map(a => a.href)).size).toBe(9)
    for (const article of knowledgeArticles) expect(html).toContain(`href="${article.href}"`)
    expect(knowledgeCategories).toHaveLength(5)
    const categories = html.split('aria-labelledby="categories-title"')[1].split('</section>')[0]
    const types = html.split('aria-labelledby="types-title"')[1].split('</section>')[0]
    expect(categories.match(/<h3(?:\s|>)/g)).toHaveLength(5)
    expect(types.match(/<h3(?:\s|>)/g)).toHaveLength(4)
    expect(html).toContain("[&amp;_a.group]:text-brand-primary-hover")
    expect(html.match(/>Start uw opdracht<\/a>/g)).toHaveLength(1)
    expect(metadata.alternates?.canonical).toBe('/kenniscentrum')
  })
  it.each(knowledgeArticles.map(a => [a.slug, a] as const))('%s heeft geldige bronnen, SEO, headings en CTA', (_, article) => {
    const html = render(<KnowledgeArticlePage content={article} />)
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html.match(/>Start uw opdracht<\/a>/g)).toHaveLength(1)
    expect(html).toContain('href="/opdracht-starten"')
    expect(html).toContain('href="/kenniscentrum"')
    expect(html).toContain('Bronnen en onderbouwing')
    expect(resolvePublicSources(article.sourceIds)).toHaveLength(article.sourceIds.length)
    expect(new Set(article.faq.map(f => f.id)).size).toBe(article.faq.length)
    expect(createPublicContentMetadata(article).alternates?.canonical).toBe(article.href)
    expect(sitemap().filter(entry => new URL(entry.url).pathname === article.href)).toHaveLength(1)
  })
  it('registreert incidenten op basis van werkdagen en behoudt de aparte meldplicht', () => {
    const article = knowledgeArticles.find(a => a.id === 'knowledge:incident-investigation')!
    expect(article.legalContext).toContain('meer dan drie werkdagen verzuim')
    expect(article.nextStep).toContain('meer dan drie werkdagen verzuim')
    expect(article.legalContext).toContain('overlijden, ziekenhuisopname of blijvend letsel')
    expect(article.lastReviewed).toBe('2026-10-13')
  })
})
