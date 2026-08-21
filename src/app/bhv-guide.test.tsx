import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const accessMock = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/lib/arbo-guides/arbo-guide-access', () => ({ getArboGuidePageAccess: accessMock.get }))
import GuidesPage from './wijzers/page'
import BhvGuidePage from './wijzers/bhv/page'
import { BhvGuide } from '@/components/public/bhv-guide'

describe('publieke BHV-wijzer', () => {
  beforeEach(() => accessMock.get.mockResolvedValue({ status: 'AUTHORIZED', userId: 'user-1', organizationId: 'organization-1', organizationName: 'Voorbeeld BV' }))

  it('is voor een geautoriseerde organisatie onderdeel van de gedeelde Arbo-wijzerfamilie', async () => {
    const overview = renderToStaticMarkup(<GuidesPage />)
    const page = renderToStaticMarkup(await BhvGuidePage())
    expect(overview).toContain('href="/wijzers/bhv"')
    expect(page).toContain('Stap 1 van 6')
    expect(page).toContain('geen verhouding')
    expect(page).toContain('<fieldset')
    expect(page).toContain('<legend')
  })

  it('houdt uitleg publiek maar toont anoniem geen vragenflow', async () => {
    accessMock.get.mockResolvedValue({ status: 'ANONYMOUS', loginHref: '/inloggen?returnTo=%2Fwijzers%2Fbhv' })
    const page = renderToStaticMarkup(await BhvGuidePage())
    expect(page).toContain('Past uw BHV-organisatie')
    expect(page).toContain('href="/inloggen?returnTo=%2Fwijzers%2Fbhv"')
    expect(page).not.toContain('Stap 1 van 6')
  })

  it('vraagt geen vrije persoonsgegevens en deelt antwoorden niet via de URL', () => {
    const html = renderToStaticMarkup(<BhvGuide />)
    expect(html).toContain('Vul geen namen, medische gegevens of incidentdetails in')
    expect(html).not.toContain('<textarea')
    expect(html).not.toContain('<form')
  })

  it('borgt focus, reduced motion, historische PDF en BHV-context in de implementatie', () => {
    const source = readFileSync(new URL('../components/public/bhv-guide.tsx', import.meta.url), 'utf8')
    expect(source).toContain("prefers-reduced-motion: reduce")
    expect(source).toContain("focus({ preventScroll: true })")
    expect(source).toContain('fetch(`/mijn-arbo-wijzers/${saved.runId}/pdf`)')
    expect(source).not.toContain("fetch('/wijzers/bhv/pdf'")
    expect(source).toContain("resolveKnowledgeContextByRoute('/wijzers/bhv')")
    expect(source).not.toContain('/wijzers/bhv/pdf?')
  })
})
