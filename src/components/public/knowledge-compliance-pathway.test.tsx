import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { knowledgeArticles } from '@/content/knowledge/articles'
import { resolvePublicContentRelations } from '@/content/public-content'
import { KnowledgeArticlePage } from './knowledge-article-page'

describe('Kennis naar wettelijke context, gratis oriëntatie en ondersteuning', () => {
  it.each(knowledgeArticles)('$slug behoudt de bestaande routes en maakt beschikbaarheid expliciet', article => {
    const html = renderToStaticMarkup(<KnowledgeArticlePage content={article} />)
    expect(html).toContain('href="/wijzers/compliance/scan"')
    expect(html).toContain('De uitgebreide Compliance Scan is nog niet beschikbaar')
    expect(html).toContain('beoordeelt niet of uw organisatie aan de wet voldoet')
    expect(html).toContain('href="/opdracht-starten"')
    expect(html).not.toContain('/wijzers/compliance/v2')
    expect(html).not.toContain('24,95')
    const related = resolvePublicContentRelations(article.id)
    expect(related.some(item => item.type === 'obligation')).toBe(true)
    expect(related.some(item => item.type === 'service')).toBe(true)
    for (const item of related.filter(item => item.type === 'obligation' || item.type === 'service')) expect(html).toContain(`href="${item.href}"`)
    expect(html.match(/id="knowledge-compliance-title"/g)).toHaveLength(1)
  })
})
