import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { expertiseOverview, serviceOverview } from '@/content/public-overviews'
import { indexablePublicRoutes } from '@/content/public-routes'
import sitemap from './sitemap'
import ServicesPage from './diensten/page'
import ElearningPage, { metadata } from './e-learning/page'

// Public rendering must not acquire a Learning identity or read personal course data.
vi.mock('@/lib/auth', () => {
  throw new Error('Public pages must not require Learning authentication')
})
vi.mock('@/lib/prisma', () => {
  throw new Error('Public pages must not load user-scoped Learning data')
})

const escapeText = (text: string) => renderToStaticMarkup(<>{text}</>)

describe('publieke e-learningpagina’s', () => {
  it('behoudt alle diensten, beschrijvingen en vervolglinks naast de nieuwe sectie', () => {
    const html = renderToStaticMarkup(<ServicesPage />)
    for (const service of [...serviceOverview, ...expertiseOverview]) {
      expect(html).toContain(escapeText(service.title))
      expect(html).toContain(escapeText(service.description))
      expect(html).toContain(`href="${service.href}"`)
    }
    expect(html).toContain('Welke ondersteuning past bij uw vraag?')
    expect(html).toContain('Verder met uw vraag')
    expect(html).toContain('E-learning &amp; opleidingen')
    expect(html).toMatch(/href="\/e-learning"[^>]*>Bekijk e-learning &amp; opleidingen<\/a>/)
  })

  it('rendert zonder sessie of Learning-database met alle koppen en werkende CTA-doelen', () => {
    const html = renderToStaticMarkup(<ElearningPage />)
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html).toContain('E-learning voor veilig en gezond werken')
    for (const heading of ['Hoe werkt het?', 'Voor deelnemers', 'Voor organisaties', 'Opleidingsaanbod', 'Ontwikkel kennis. Pas het toe in de praktijk.']) {
      expect(html).toMatch(new RegExp(`<h2[^>]*>${heading.replace(/[.?]/g, '\\$&')}<\/h2>`))
    }
    expect(html).toContain('href="#aanbod"')
    expect(html).toContain('id="aanbod"')
    expect(html).toContain('Bekijk het aanbod')
    expect(html).toContain('href="/inloggen"')
    expect(html).toContain('>Inloggen</a>')
    expect(html).toContain('aria-label="Broodkruimelpad"')
  })

  it('presenteert een voorlopige aanbodsectie zonder beschikbare opleidingen te beloven', () => {
    const html = renderToStaticMarkup(<ElearningPage />)
    expect(html).toContain('RI&amp;E in de praktijk')
    expect(html).toContain('In ontwikkeling')
    expect(html).toContain('Er zijn op dit moment nog geen opleidingen beschikbaar')
    expect(html).toContain('voortgang en cursusafronding zijn nog niet beschikbaar')
    expect(html).toContain('als organisatie volgen is nog niet beschikbaar')
    expect(html).not.toContain('Start opleiding')
  })

  it('registreert de publieke route voor SEO met eigen metadata', () => {
    expect(indexablePublicRoutes).toContain('/e-learning')
    expect(sitemap().some(entry => new URL(entry.url).pathname === '/e-learning')).toBe(true)
    expect(metadata.title).toContain('WorkMatchr')
    expect(metadata.description).toContain('arbeidsveiligheid')
    expect(metadata.alternates).toEqual({ canonical: '/e-learning' })
    expect(metadata.openGraph).toMatchObject({ url: '/e-learning' })
  })
})
