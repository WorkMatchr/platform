import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import GuidesPage from './wijzers/page'
import ComplianceGuidePage from './wijzers/compliance/page'
import { ComplianceGuide } from '@/components/public/compliance-guide'

describe('publieke wijzers', () => {
  it('biedt Advieswijzer en Compliance-wijzer op /wijzers', () => {
    const html = renderToStaticMarkup(<GuidesPage />)
    expect(html).toContain('href="/advieswijzer"')
    expect(html).toContain('href="/wijzers/compliance"')
    expect(html).not.toContain('RI&amp;E-wijzer')
    expect(html).not.toContain('Risicowijzer')
  })

  it('rendert de Compliance-wijzer met juridische begrenzing en toegankelijke vraaggroepen', () => {
    const html = renderToStaticMarkup(<ComplianceGuidePage />)
    expect(html).toContain('geen formele juridische beoordeling of certificering')
    expect(html).toContain('Stap 1 van 5')
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
})
