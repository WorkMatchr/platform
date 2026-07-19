import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import RieServiceRoute, { metadata as serviceMetadata } from './diensten/rie/page'
import RieQuestionPage, { metadata as questionMetadata } from './kenniscentrum/moet-ik-een-rie-hebben/page'
import RieLegalRoute, { metadata as legalMetadata } from './wettelijke-verplichtingen/rie/page'
import { rieLegalPage, rieQuestionArticle, rieServicePage } from '@/content/knowledge/rie'
import { resolvePublicContentCta, resolvePublicContentRelations } from '@/content/public-content'
import { isRegisteredPublicHref } from '@/content/public-routes'

const routes = [
  ['vraag', RieQuestionPage, rieQuestionArticle, 'Kennis', '/kenniscentrum/moet-ik-een-rie-hebben', '/wettelijke-verplichtingen/rie', '/diensten/rie'],
  ['dienst', RieServiceRoute, rieServicePage, 'Dienst', '/diensten/rie', '/advieswijzer', '/wettelijke-verplichtingen/rie'],
  ['verplichting', RieLegalRoute, rieLegalPage, 'Wettelijke verplichting', '/wettelijke-verplichtingen/rie', '/kenniscentrum/moet-ik-een-rie-hebben', '/diensten/rie'],
] as const

describe('RI&E-kenniscluster', () => {
  for (const [name, Page, document, contentRole, currentHref, primaryHref, supplementalHref] of routes) {
    it(`rendert de ${name}-route vanuit de typed contentbron`, () => {
      const html = renderToStaticMarkup(<Page />)
      expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
      expect(html).toContain(document.title.replaceAll('&', '&amp;'))
      expect(html).toContain(contentRole)
      expect(html).toContain('Bronnen en onderbouwing')
      expect(html).toContain('Laatst inhoudelijk gecontroleerd')
      expect(html).toContain('Bronnen gecontroleerd')
      expect(html).toContain('/advieswijzer')
      expect(html).not.toMatch(/meest gekozen|populairst|trend|premium/i)
      expect(html).not.toContain('href="#"')
      expect(html).toContain('aria-label="Broodkruimelpad"')
      expect(html).toMatch(/<a[^>]+href="\/">Home<\/a>/)
      expect(html).toMatch(/<span aria-current="page">[^<]+<\/span>/)
      const internalHrefs = [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((match) => match[1]!)
      expect(internalHrefs.every(isRegisteredPublicHref)).toBe(true)
      expect(internalHrefs).toContain('/advieswijzer')
      expect(internalHrefs).not.toContain(currentHref)
      expect(html.indexOf(`href="${primaryHref}"`)).toBeLessThan(html.indexOf(`href="${supplementalHref}"`))
      for (const relatedHref of [
        '/kenniscentrum/moet-ik-een-rie-hebben',
        '/wettelijke-verplichtingen/rie',
        '/diensten/rie',
      ].filter((href) => href !== currentHref)) {
        expect(internalHrefs).toContain(relatedHref)
      }
      expect(html).not.toMatch(/vraag direct een offerte aan|vind automatisch een specialist|start AI-advies/i)
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

  it('verbindt iedere detailpagina met de twee andere rollen en de Advieswijzer', () => {
    for (const document of [rieQuestionArticle, rieServicePage, rieLegalPage]) {
      const relations = resolvePublicContentRelations(document.contentId)
      const cta = resolvePublicContentCta(document.contentId)
      expect(relations).toHaveLength(3)
      expect(new Set(relations.map((relation) => relation.href))).toHaveLength(3)
      expect(relations.some((relation) => relation.href === '/advieswijzer')).toBe(true)
      expect(relations.some((relation) => relation.id === document.contentId)).toBe(false)
      expect(cta?.primary.href).toMatch(/^\//)
    }
  })
})
