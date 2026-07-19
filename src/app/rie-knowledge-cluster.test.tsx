import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import RieServiceRoute, { metadata as serviceMetadata } from './diensten/rie/page'
import RieQuestionPage, { metadata as questionMetadata } from './kenniscentrum/moet-ik-een-rie-hebben/page'
import RieLegalRoute, { metadata as legalMetadata } from './wettelijke-verplichtingen/rie/page'
import { rieLegalPage, rieQuestionArticle, rieServicePage } from '@/content/knowledge/rie'

const routes = [
  ['vraag', RieQuestionPage, rieQuestionArticle],
  ['dienst', RieServiceRoute, rieServicePage],
  ['verplichting', RieLegalRoute, rieLegalPage],
] as const

describe('RI&E-kenniscluster', () => {
  for (const [name, Page, document] of routes) {
    it(`rendert de ${name}-route vanuit de typed contentbron`, () => {
      const html = renderToStaticMarkup(<Page />)
      expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
      expect(html).toContain(document.title.replaceAll('&', '&amp;'))
      expect(html).toContain('Bronnen en onderbouwing')
      expect(html).toContain('Laatst inhoudelijk gecontroleerd')
      expect(html).toContain('Bronnen gecontroleerd')
      expect(html).toContain('/advieswijzer')
      expect(html).not.toMatch(/meest gekozen|populairst|trend|premium/i)
      expect(html).not.toContain('href="#"')
      expect(html).toContain('aria-label="Broodkruimelpad"')
      expect(html).toMatch(/<a[^>]+href="\/">Home<\/a>/)
      expect(html).toMatch(/<span aria-current="page">[^<]+<\/span>/)
    })
  }

  it('legt bewijs- en validatiestatus per bron vast', () => {
    expect(rieQuestionArticle.sources.every((source) => source.evidenceLevel)).toBe(true)
    expect(rieQuestionArticle.sources.every((source) => source.validationStatus === 'VALIDATED')).toBe(true)
  })

  it('heeft unieke metadata en canonicals', () => {
    const metadata = [questionMetadata, serviceMetadata, legalMetadata]
    expect(new Set(metadata.map((item) => item.title))).toHaveLength(3)
    expect(metadata.every((item) => item.description && item.alternates?.canonical)).toBe(true)
  })

  it('gebruikt alleen geldige gerelateerde interne routes', () => {
    const valid = new Set(['/diensten/rie', '/wettelijke-verplichtingen/rie'])
    expect(rieQuestionArticle.relatedTopics.every((topic) => valid.has(topic.href))).toBe(true)
  })
})
