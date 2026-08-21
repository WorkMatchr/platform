import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const accessMock = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/lib/arbo-guides/arbo-guide-access', () => ({ getArboGuidePageAccess: accessMock.get }))
import GuidesPage from './wijzers/page'
import ComplianceGuidePage from './wijzers/compliance/page'
import { metadata as guidesMetadata } from './wijzers/page'
import { ComplianceGuide, ConsultedSources } from '@/components/public/compliance-guide'
import { collectComplianceSources } from '@/lib/compliance-guide/compliance-report'
import { readFileSync } from 'node:fs'

describe('publieke Arbo-wijzers', () => {
  beforeEach(() => accessMock.get.mockResolvedValue({ status: 'AUTHORIZED', userId: 'user-1', organizationId: 'organization-1', organizationName: 'Voorbeeld BV' }))
  it('biedt Advieswijzer en Compliance-wijzer op /wijzers', () => {
    const html = renderToStaticMarkup(<GuidesPage />)
    expect(html).toContain('href="/advieswijzer"')
    expect(html).toContain('href="/wijzers/compliance"')
    expect(html).toContain('Arbo-wijzers')
    expect(guidesMetadata.title).toBe('Arbo-wijzers | WorkMatchr')
    expect(html).not.toContain('RI&amp;E-wijzer')
    expect(html).not.toContain('Risicowijzer')
  })

  it('rendert de Compliance-wijzer voor een geautoriseerde organisatie met juridische begrenzing en toegankelijke vraaggroepen', async () => {
    const html = renderToStaticMarkup(await ComplianceGuidePage())
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

  it('houdt uitleg publiek maar toont anoniem alleen een veilige loginroute met returnTo', async () => {
    accessMock.get.mockResolvedValue({ status: 'ANONYMOUS', loginHref: '/inloggen?returnTo=%2Fwijzers%2Fcompliance' })
    const html = renderToStaticMarkup(await ComplianceGuidePage())
    expect(html).toContain('Welke algemene arboverplichtingen')
    expect(html).toContain('De Arbo-wijzers zijn gratis')
    expect(html).toContain('href="/inloggen?returnTo=%2Fwijzers%2Fcompliance"')
    expect(html).not.toContain('Stap 1 van 5')
  })

  it('vraagt geen persoonsgegevens en verstuurt antwoorden niet via een formulier-URL', () => {
    const html = renderToStaticMarkup(<ComplianceGuide />)
    expect(html).toContain('Vul geen namen, medische gegevens of ongevalsgegevens in')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('name="employeeName"')
  })

  it('downloadt uitsluitend een opgeslagen historisch rapport en houdt stapfocus en scrollgedrag centraal', () => {
    const source = readFileSync(new URL('../components/public/compliance-guide.tsx', import.meta.url), 'utf8')
    expect(source).toContain('fetch(`/mijn-arbo-wijzers/${savedRun.runId}/pdf`)')
    expect(source).not.toContain("fetch('/wijzers/compliance/pdf'")
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
    expect(html).toContain('Wetgeving')
    expect(html).toContain('Richtlijn')
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
