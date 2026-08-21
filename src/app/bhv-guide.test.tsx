import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import GuidesPage from './wijzers/page'
import BhvGuidePage from './wijzers/bhv/page'
import { BhvGuide } from '@/components/public/bhv-guide'

describe('publieke BHV-wijzer', () => {
  it('is onderdeel van de gedeelde Arbo-wijzerfamilie', () => {
    const overview = renderToStaticMarkup(<GuidesPage />)
    const page = renderToStaticMarkup(<BhvGuidePage />)
    expect(overview).toContain('href="/wijzers/bhv"')
    expect(page).toContain('Stap 1 van 6')
    expect(page).toContain('geen verhouding')
    expect(page).toContain('<fieldset')
    expect(page).toContain('<legend')
  })

  it('vraagt geen vrije persoonsgegevens en deelt antwoorden niet via de URL', () => {
    const html = renderToStaticMarkup(<BhvGuide />)
    expect(html).toContain('Vul geen namen, medische gegevens of incidentdetails in')
    expect(html).not.toContain('<textarea')
    expect(html).not.toContain('<form')
  })

  it('borgt focus, reduced motion, POST-PDF en BHV-context in de implementatie', () => {
    const source = readFileSync(new URL('../components/public/bhv-guide.tsx', import.meta.url), 'utf8')
    expect(source).toContain("prefers-reduced-motion: reduce")
    expect(source).toContain("focus({ preventScroll: true })")
    expect(source).toContain("fetch('/wijzers/bhv/pdf'")
    expect(source).toContain("resolveKnowledgeContextByRoute('/wijzers/bhv')")
    expect(source).not.toContain('/wijzers/bhv/pdf?')
  })
})
