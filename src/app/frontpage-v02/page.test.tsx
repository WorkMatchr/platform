import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Preview from './page'
import { PublicHomepageV02 } from '@/components/public/public-homepage-v02'
import { isRegisteredPublicHref } from '@/content/public-routes'

describe('lokale homepage v0.2', () => {
  it('toont platform vóór kennis, één H1 en uitsluitend bestaande bestemmingen', () => {
    const html = renderToStaticMarkup(<PublicHomepageV02 />)
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html).toContain('Vind de juiste deskundige voor uw vraag')
    expect(html.indexOf('Van hulpvraag naar opdrachtnemer')).toBeLessThan(html.indexOf('WETTELIJKE VERPLICHTINGEN'))
    expect(html.indexOf('Waarom organisaties')).toBeLessThan(html.indexOf('KENNISCENTRUM'))
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1])
    expect(hrefs.every(href => href === '#advieswijzer' || isRegisteredPublicHref(href.split('?')[0]))).toBe(true)
    expect(html).toContain('WorkMatchr / Vraag ondersteuning aan')
    expect(html).toContain('Stap 1 van 3')
    expect(html).toContain('Nee, help mij mijn vraag bepalen')
    expect(html).not.toContain('Voorbeeldopdracht')
    expect(html).not.toContain('voorbeeldreacties')
    expect(html).toContain('Optioneel')
    expect(html).toContain('lg:grid-cols-4')
    expect(hrefs.filter(href => href.startsWith('/diensten/'))).toHaveLength(6)
    expect(hrefs.filter(href => href.startsWith('/kenniscentrum/'))).toHaveLength(3)
    expect(hrefs.filter(href => href.startsWith('/wettelijke-verplichtingen/'))).toHaveLength(3)

  })
  it('redirect de oude previewroute permanent naar de homepage', () => {
    expect(() => Preview()).toThrow('NEXT_REDIRECT')
  })
})
