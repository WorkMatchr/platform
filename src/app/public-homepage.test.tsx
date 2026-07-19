import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { publicHomepageContent } from '@/content/public-homepage'
import { isRegisteredPublicHref, publicFooterGroups, publicNavigationItems } from '@/content/public-routes'
import { Footer } from '@/components/layout/footer'
import HomePage, { metadata } from './page'

function renderHomepage() {
  return renderToStaticMarkup(<HomePage />)
}

describe('vraaggestuurde publieke homepage', () => {
  it('rendert exact één H1 en eerlijke hero-acties', () => {
    const html = renderHomepage()
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html).toContain('Waarmee kunnen wij u helpen?')
    expect(html).toContain('href="/#situaties"')
    expect(html).toContain('Bekijk waar u kunt beginnen')
    expect(html).toContain('href="/diensten"')
    expect(html).toContain('Bekijk alle diensten')
    expect(html).not.toContain('Start de zelfscan')
  })

  it('rendert alle situaties vanuit de typeveilige contentbron', () => {
    const html = renderHomepage()
    expect(publicHomepageContent.situations).toHaveLength(6)
    for (const situation of publicHomepageContent.situations) {
      expect(html).toContain(situation.title.replaceAll('&', '&amp;'))
      expect(html).toContain(`href="${situation.href}"`)
    }
    expect(html).toContain('Ik heb personeel in dienst')
    expect(html).toContain('Ik twijfel of ik een RI&amp;E nodig heb')
    expect(html).toContain('href="/kenniscentrum/moet-ik-een-rie-hebben"')
  })

  it('behoudt een logische semantische headingstructuur', () => {
    const html = renderHomepage()
    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('<h2'))
    expect(html).toContain('<h2')
    expect(html).toContain('<h3')
  })

  it('gebruikt uitsluitend bestaande interne routes en één bewust homepageanker', () => {
    const html = renderHomepage()
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])
    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.every(isRegisteredPublicHref)).toBe(true)
    expect(hrefs.filter((href) => href.includes('#'))).toEqual(['/#situaties', '/#situaties'])
    expect(html).toContain('id="situaties"')
    expect(html).toContain('tabindex="-1"')
  })

  it('toont de publieke overzichten en uitsluitend de gepubliceerde kennisinhoud', () => {
    const html = renderHomepage()
    for (const href of ['/diensten', '/wettelijke-verplichtingen', '/sectoren', '/kenniscentrum']) {
      expect(html).toContain(`href="${href}"`)
    }
    expect(html).toContain('Moet ik een RI&amp;E hebben?')
    expect(html).toContain('Gepubliceerd · bronnen gecontroleerd')
    expect(html).not.toContain('Zoeken in het kenniscentrum')
  })

  it('rendert drie processtappen en vier vertrouwensprincipes', () => {
    const html = renderHomepage()
    expect(publicHomepageContent.steps).toHaveLength(3)
    expect(publicHomepageContent.principles).toHaveLength(4)
    for (const item of [...publicHomepageContent.steps, ...publicHomepageContent.principles]) {
      expect(html).toContain(item.title)
    }
    expect(html).toContain('De publieke homepage selecteert niet automatisch een aanbieder')
  })

  it('heeft unieke homepage-metadata met canonical en Open Graph', () => {
    expect(metadata.title).toBe('Waarmee kunnen wij u helpen? | WorkMatchr')
    expect(metadata.description).toBeTruthy()
    expect(metadata.alternates?.canonical).toBe('/')
    expect(metadata.openGraph?.title).toBeTruthy()
    expect(metadata.openGraph?.description).toBeTruthy()
    expect(metadata.openGraph?.url).toBe('/')
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
    expect(publicNavigationItems.length).toBeGreaterThan(1)
    for (const link of publicNavigationItems) expect(link.href.startsWith('/')).toBe(true)
  })

  it('rendert de vereiste publieke footerlinks en disclaimer', () => {
    const html = renderToStaticMarkup(<Footer />)
    for (const group of publicFooterGroups) {
      for (const link of group.links) {
        expect(html).toContain(link.label)
        expect(html).toContain(`href="${link.href}"`)
      }
    }
    expect(html).toContain('vervangt geen beoordeling van uw specifieke situatie')
  })
})
