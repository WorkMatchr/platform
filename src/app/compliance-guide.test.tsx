import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import GuidesPage from './wijzers/page'
import ComplianceGuidePage from './wijzers/compliance/page'
import { metadata as guidesMetadata } from './wijzers/page'
import { ComplianceGuide, ConsultedSources } from '@/components/public/compliance-guide'
import { collectComplianceSources } from '@/lib/compliance-guide/compliance-report'
import { readFileSync } from 'node:fs'

describe('publieke Arbo-wijzers', () => {
  it('biedt Advieswijzer en Compliance-wijzer op /wijzers', () => {
    const html = renderToStaticMarkup(<GuidesPage />)
    expect(html).toContain('href="/advieswijzer"')
    expect(html).toContain('href="/wijzers/compliance"')
    expect(html).toContain('Arbo-wijzers')
    expect(guidesMetadata.title).toBe('Arbo-wijzers | WorkMatchr')
    expect(html).not.toContain('RI&amp;E-wijzer')
    expect(html).not.toContain('Risicowijzer')
  })

  it('rendert de Compliance-wijzer met juridische begrenzing en toegankelijke vraaggroepen', () => {
    const html = renderToStaticMarkup(<ComplianceGuidePage />)
    expect(html).toContain('geen formele juridische beoordeling of certificering')
    expect(html).toContain('Stap 1 van 5')
    expect(html).toContain('href="/wijzers"')
    expect(html).toContain('Arbo-wijzers')
    expect(html).toContain('<fieldset')
    expect(html).toContain('<legend')
    expect(html).toContain('min-h-11')
    expect(html).not.toContain('compliance-score')
    expect(html).not.toContain('U voldoet aan de Arbowet')
  })

  it('vraagt geen persoonsgegevens en verstuurt antwoorden niet via een formulier-URL', () => {
    const html = renderToStaticMarkup(<ComplianceGuide />)
    expect(html).toContain('Vul geen namen, medische gegevens of ongevalsgegevens in')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('name="employeeName"')
  })

  it('downloadt BASIC via POST en houdt stapfocus en scrollgedrag centraal', () => {
    const source = readFileSync(new URL('../components/public/compliance-guide.tsx', import.meta.url), 'utf8')
    expect(source).toContain("fetch('/wijzers/compliance/pdf'")
    expect(source).toContain("body: JSON.stringify({ tier: 'BASIC', answers })")
    expect(source).toContain("scrollIntoView({ behavior: complianceStepScrollBehavior(reducedMotion), block: 'start' })")
    expect(source).toContain("focus({ preventScroll: true })")
    expect(source).toContain('scroll-mt-24')
    expect(source).not.toContain('/wijzers/compliance/pdf?')
    expect(source).not.toContain('URLSearchParams')
  })

  it('toont een compacte, toegankelijke en mobiel enkelkoloms bronnenlijst', () => {
    const sources = collectComplianceSources([
      { sourceIds: ['arbowet-current', 'arboportaal-arbobeleid'] },
      { sourceIds: ['arbowet-current'] },
    ])
    const html = renderToStaticMarkup(<ConsultedSources sources={sources} />)

    expect(html).toContain('Geraadpleegde bronnen')
    expect(html.match(/Arbeidsomstandighedenwet/g)).toHaveLength(1)
    expect(html).toContain('grid-cols-1')
    expect(html).toContain('md:grid-cols-2')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer"')
    expect(html).toContain('opent in een nieuw venster')
    expect(html).toContain('gecontroleerd op')
  })

  it('verwijdert bronblokken uit individuele kaarten en hergebruikt centrale deduplicatie', () => {
    const source = readFileSync(new URL('../components/public/compliance-guide.tsx', import.meta.url), 'utf8')
    expect(source).not.toContain('Officiële bronnen')
    expect(source).toContain('collectComplianceSources(results)')
    expect(source).toContain('<ConsultedSources sources={sources} />')
  })
})
