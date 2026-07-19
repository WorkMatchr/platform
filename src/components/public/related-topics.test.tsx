import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { publicContentCatalog, type ResolvedPublicContentRelation } from '@/content/public-content'
import { RelatedTopics } from './related-topics'

const relation = (id: keyof typeof publicContentCatalog): ResolvedPublicContentRelation => ({
  ...publicContentCatalog[id],
  purpose: 'support',
})

describe('RelatedTopics', () => {
  it('toont geen lege sectie', () => {
    expect(renderToStaticMarkup(<RelatedTopics currentContentId="service:rie" topics={[]} />)).toBe('')
  })

  it('toont typen, verwijdert huidige en dubbele items en respecteert de limiet', () => {
    const html = renderToStaticMarkup(
      <RelatedTopics
        currentContentId="knowledge:rie-required"
        limit={2}
        topics={[
          relation('knowledge:rie-required'),
          relation('obligation:rie'),
          relation('obligation:rie'),
          relation('service:rie'),
          relation('tool:advice-guide'),
        ]}
      />,
    )

    expect(html).toContain('<h2')
    expect(html.match(/<h3/g)).toHaveLength(2)
    expect(html).toContain('Wettelijke verplichting')
    expect(html).toContain('Dienst')
    expect(html).not.toContain('Moet ik een RI&amp;E hebben?')
    expect(html).not.toContain('Begeleide vervolgstap')
    expect(html.match(/href=/g)).toHaveLength(2)
  })
})
