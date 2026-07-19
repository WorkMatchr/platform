import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { publicFooterGroups, publicHomepageContent, publicNavigation } from '@/content/public-homepage'
import { Footer } from '@/components/layout/footer'
import HomePage from './page'

function renderHomepage() {
  return renderToStaticMarkup(<HomePage />)
}

describe('vraaggestuurde publieke homepage', () => {
  it('rendert exact één H1 en de primaire Advieswijzer-actie', () => {
    const html = renderHomepage()
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html).toContain('Waarmee kunnen wij U helpen?')
    expect(html).toContain('Start de Advieswijzer')
  })

  it('rendert alle situaties vanuit de typeveilige contentbron', () => {
    const html = renderHomepage()
    expect(publicHomepageContent.situations).toHaveLength(7)
    for (const situation of publicHomepageContent.situations) {
      expect(html).toContain(situation.title.replaceAll('&', '&amp;'))
      expect(html).toContain(`href="${situation.href}"`)
    }
  })

  it('behoudt een logische semantische headingstructuur', () => {
    const html = renderHomepage()
    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('<h2'))
    expect(html).toContain('<h2')
    expect(html).toContain('<h3')
  })

  it('gebruikt uitsluitend geldige interne links en geen dode hashlinks', () => {
    const html = renderHomepage()
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])
    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.every((href) => href.startsWith('/'))).toBe(true)
    expect(hrefs).not.toContain('#')
  })

  it('bevat geen uitgesloten marketing- of verzonnen trendclaims', () => {
    const visibleContent = renderHomepage().toLowerCase()
    for (const excluded of ['de beste', 'revolutionair', 'populair deze maand', 'meest gezocht', 'trend']) {
      expect(visibleContent).not.toContain(excluded)
    }
  })
})

describe('publieke navigatieconfiguratie en footer', () => {
  it('geeft iedere navigatielink een absolute interne href', () => {
    expect(publicNavigation.length).toBeGreaterThan(1)
    for (const link of publicNavigation) expect(link.href.startsWith('/')).toBe(true)
  })

  it('rendert de vereiste publieke footerlinks en disclaimer', () => {
    const html = renderToStaticMarkup(<Footer />)
    for (const group of publicFooterGroups) {
      for (const link of group.links) {
        expect(html).toContain(link.label)
        expect(html).toContain(`href="${link.href}"`)
      }
    }
    expect(html).toContain('vervangt geen beoordeling van Uw specifieke situatie')
  })
})
