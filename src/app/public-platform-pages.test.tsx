import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ServicesPage from './diensten/page'
import KnowledgeCenterPage from './kenniscentrum/page'
import SectorsPage from './sectoren/page'
import LegalObligationsPage from './wettelijke-verplichtingen/page'

const pages = [
  ['diensten', ServicesPage, 'Welke ondersteuning past bij uw vraag?'],
  ['wettelijke verplichtingen', LegalObligationsPage, 'Wat moet uw organisatie regelen?'],
  ['sectoren', SectorsPage, 'Aandachtspunten verschillen per werkomgeving'],
  ['kenniscentrum', KnowledgeCenterPage, 'Betrouwbare uitleg begint bij uw vraag'],
] as const

describe('publieke platformpagina’s', () => {
  for (const [name, Page, title] of pages) {
    it(`rendert het overzicht ${name} met gedeelde structuur`, () => {
      const html = renderToStaticMarkup(<Page />)
      expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
      expect(html).toContain(title)
      expect(html).toContain('aria-label="Broodkruimelpad"')
      expect(html).not.toContain('href="#"')
      expect(html).not.toContain('overflow-x')
    })
  }

  it('maakt de niet-functionele zoekinterface eerlijk herkenbaar', () => {
    const html = renderToStaticMarkup(<KnowledgeCenterPage />)
    expect(html).toContain('disabled=""')
    expect(html).toContain('Zoeken en filteren zijn nog niet beschikbaar')
    expect(html).not.toMatch(/populair|trending/i)
  })

  it('laat lange kaarttitels veilig afbreken op smalle schermen', () => {
    const html = renderToStaticMarkup(<LegalObligationsPage />)
    expect(html).toContain('Arbeidsgezondheidskundig onderzoek')
    expect(html).toContain('break-words')
  })

  it('gebruikt uitsluitend bestaande interne bestemmingen', () => {
    const html = pages.map(([, Page]) => renderToStaticMarkup(<Page />)).join('')
    const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1])
    expect(hrefs.every((href) => !href?.includes('#') || href === '/')).toBe(true)
    expect(hrefs).toContain('/diensten/rie')
    expect(hrefs).toContain('/wettelijke-verplichtingen/rie')
    expect(hrefs).toContain('/kenniscentrum/moet-ik-een-rie-hebben')
  })

  it('verbindt overzichten compact met een zichtbaar contenttype en begeleide vervolgstap', () => {
    for (const [, Page] of pages) {
      const html = renderToStaticMarkup(<Page />)
      expect(html).toContain('Verken vanuit dit overzicht')
      expect(html).toContain('Start de Advieswijzer')
      expect(html).toMatch(/Kennis|Dienst/)
      expect(html.match(/Verken vanuit dit overzicht/g)).toHaveLength(1)
      expect(html).not.toMatch(/href="\/sectoren\//)
    }
  })
})
