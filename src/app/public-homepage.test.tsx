import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { isRegisteredPublicHref } from '@/content/public-routes'
import HomePage, { metadata } from './page'
import { PublicHomepageV02 } from '@/components/public/public-homepage-v02'

describe('homepage v0.2 release', () => {
  it('rendert v0.2 op de canonieke homepage', () => {
    expect(renderToStaticMarkup(<HomePage />)).toBe(renderToStaticMarkup(<PublicHomepageV02 />))
    expect(metadata.alternates?.canonical).toBe('/')
    expect(metadata.robots).toBeUndefined()
  })
  it('behoudt alle instaplinks en generieke CTA’s', () => {
    const html = renderToStaticMarkup(<HomePage />)
    expect(html.match(/href="\/advieswijzer\?start=deskundigheid"/g)).toHaveLength(2)
    expect(html.match(/href="\/advieswijzer\?start=onderwerp"/g)).toHaveLength(3)
    expect(html).toContain('href="/advieswijzer"')
    expect(html).toContain('Deskundigheid voor verschillende Arbo- en veiligheidsvragen')
    expect(html).not.toContain('frontpage-v02')
  })
})

describe('A01 homepagecontract', () => {
  function page() { return new JSDOM(renderToStaticMarkup(<HomePage />)).window.document }

  it('laat de onbekende-deskundigheidkeuze direct naar de onderwerpflow gaan', () => {
    const links = [...page().querySelectorAll('a')]
    const unknown = links.find(link => link.textContent === 'Ik weet nog niet wat ik nodig heb')!
    expect(unknown.getAttribute('href')).toBe('/advieswijzer?start=onderwerp')
    const choices = links.filter(link => link.getAttribute('href') === '/advieswijzer?start=onderwerp')
    expect(choices).toHaveLength(3)
    expect(choices[0].textContent).toContain('Nee, ik kies eerst een onderwerp')
    expect(choices[0].textContent).toContain('Ik beschrijf waar mijn vraag over gaat.')
  })

  it('belooft geen automatische expertisebepaling in de eenvoudige intake', () => {
    const text = page().body.textContent!
    expect(text).not.toContain('WorkMatchr helpt mij eerst bepalen wat passend is')
    expect(text).not.toContain('helpt WorkMatchr u eerst bepalen')
    expect(text).toContain('Weet u de deskundigheid nog niet? Kies dan het onderwerp van uw vraag.')
    expect(text).not.toContain('Stap 1 van 3')
  })

  it('heeft één H1, een oplopende kopstructuur en benoemde links naar bestaande routes', () => {
    const document = page()
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    headings.slice(1).forEach((heading, index) => {
      expect(Number(heading.tagName[1])).toBeLessThanOrEqual(Number(headings[index].tagName[1]) + 1)
    })
    for (const link of document.querySelectorAll('a')) {
      const href = link.getAttribute('href')!
      expect(link.textContent?.trim()).toBeTruthy()
      if (href.startsWith('#')) {
        expect(document.getElementById(href.slice(1))?.getAttribute('tabindex')).toBe('-1')
      } else {
        expect(isRegisteredPublicHref(href.split('?')[0]), href).toBe(true)
      }
    }
  })

  it('behoudt canonieke SEO en generieke aanvraag-CTA’s', () => {
    expect(metadata.title).toBe('Vind de juiste deskundige voor uw vraag | WorkMatchr')
    expect(metadata.description).toBeTruthy()
    expect(metadata.alternates?.canonical).toBe('/')
    expect(metadata.openGraph).toMatchObject({ url: '/', type: 'website' })
    const primary = [...page().querySelectorAll('a')].filter(link => link.textContent === 'Vraag ondersteuning aan')
    expect(primary).toHaveLength(3)
    primary.forEach(link => expect(link.getAttribute('href')).toBe('/advieswijzer'))
  })
})
