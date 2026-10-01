import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { expertiseOverview, serviceOverview } from '@/content/public-overviews'
import { indexablePublicRoutes } from '@/content/public-routes'
import sitemap from './sitemap'
import ServicesPage from './diensten/page'
import ElearningPage, { metadata } from './e-learning/page'
import RieLearningPage, { metadata as rieMetadata } from './e-learning/rie-in-de-praktijk/page'
import HomePage from './page'
import { publicLearning } from '@/content/public-learning'

// Public rendering must not acquire a Learning identity or read personal course data.
vi.mock('@/lib/auth', () => {
  throw new Error('Public pages must not require Learning authentication')
})
vi.mock('@/lib/prisma', () => {
  throw new Error('Public pages must not load user-scoped Learning data')
})

const escapeText = (text: string) => renderToStaticMarkup(<>{text}</>)

describe('publieke e-learningpagina’s', () => {
  it('verbindt de compacte homepagesectie met overzicht en detail', () => {
    const html = renderToStaticMarkup(<HomePage />)
    expect(html).toContain('Praktische Arbo-opleidingen')
    expect(html).toContain('RI&amp;E in de praktijk')
    expect(html).toContain('certificaat van afronding')
    expect(html).toContain('href="/e-learning"')
    expect(html).toContain('href="/e-learning/rie-in-de-praktijk"')
  })

  it('toont H1–H10 in de vastgelegde volgorde, toetsgrens, certificaat, kennisbehoud en prijzen', () => {
    const html = renderToStaticMarkup(<RieLearningPage />)
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    const chapters = ['Waarom een RI&E?', 'Wie doet wat?', 'Risico’s inventariseren', 'Risico’s beoordelen', 'Maatregelen bepalen', 'Plan van Aanpak: van risico naar actie', 'Toetsing van de RI&E', 'RI&E actueel houden', 'Van papier naar praktijk', 'Integrale praktijkcasus']
    expect(publicLearning.chapters).toEqual(chapters)
    let previous = -1
    chapters.forEach((chapter, index) => {
      const current = html.indexOf(escapeText('H' + (index + 1) + ' — ' + chapter))
      expect(current).toBeGreaterThan(previous)
      previous = current
    })
    for (const text of ['Voor wie?', 'Wat leert u?', '50 vragen', '40/50 = 80%', 'certificaat van afronding', 'geen wettelijk erkend diploma', '12 weken', '5 vragen per week', 'jaarherinnering', '10-vragencheck', '€149', '€595', '5 deelnemers', 'Binnenkort beschikbaar']) expect(html).toContain(text)
  })

  it.each([['homepage', HomePage], ['overzicht', ElearningPage], ['detail', RieLearningPage]] as const)('biedt op %s alleen informatie, zonder Learning-activatie', (_, Page) => {
    const html = renderToStaticMarkup(<Page />)
    expect(html).not.toMatch(/Koop nu|Start nu|Direct inschrijven/i)
    expect(html).not.toMatch(/href="[^"]*(?:e-learnings|retention|checkout|enroll|certificaten)/i)
    expect(html).not.toContain('<form')
    expect(html).toContain('Binnenkort beschikbaar')
  })

  it('behoudt alle diensten, beschrijvingen en vervolglinks naast de nieuwe sectie', () => {
    const html = renderToStaticMarkup(<ServicesPage />)
    for (const service of [...serviceOverview, ...expertiseOverview]) {
      expect(html).toContain(escapeText(service.title))
      expect(html).toContain(escapeText(service.description))
      expect(html).toContain(`href="${service.href}"`)
    }
    expect(html).toContain('Welke ondersteuning past bij uw vraag?')
    expect(html).toContain('Verder met uw vraag')
    expect(html).toContain('Zelf kennis opbouwen?')
    expect(html).toContain('via WorkMatchr een professional kunt inschakelen')
    expect(html).toContain('Naast het vinden van professionals')
    expect(html.indexOf('Zelf kennis opbouwen?')).toBeGreaterThan(html.indexOf('Verder met uw vraag'))
    expect(html).toMatch(/href="\/e-learning"[^>]*>Bekijk E-learning<\/a>/)
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
    expect(html).toContain('href="/e-learning/rie-in-de-praktijk"')
    expect(html).toContain('aria-label="Broodkruimelpad"')
  })

  it('presenteert een voorlopige aanbodsectie zonder beschikbare opleidingen te beloven', () => {
    const html = renderToStaticMarkup(<ElearningPage />)
    expect(html).toContain('RI&amp;E in de praktijk')
    expect(html).toContain('Binnenkort beschikbaar')
    expect(html).toContain('10 hoofdstukken')
    expect(html).toContain('eindtoets')
    expect(html).toContain('certificaat van afronding')
    expect(html).toContain('optioneel kennisbehoud')
    expect(html).toContain('€149')
    expect(html).toContain('€595')
    expect(html).toContain('5 deelnemers')
    expect(html).not.toContain('Start opleiding')
  })

  it('registreert de publieke route voor SEO met eigen metadata', () => {
    expect(indexablePublicRoutes).toContain('/e-learning')
    expect(sitemap().some(entry => new URL(entry.url).pathname === '/e-learning')).toBe(true)
    expect(metadata.title).toContain('WorkMatchr')
    expect(metadata.description).toContain('arbeidsveiligheid')
    expect(metadata.alternates).toEqual({ canonical: '/e-learning' })
    expect(metadata.openGraph).toMatchObject({ url: '/e-learning' })
    expect(sitemap().some(entry => new URL(entry.url).pathname === publicLearning.href)).toBe(true)
    expect(rieMetadata.alternates).toEqual({ canonical: publicLearning.href })
    expect(rieMetadata.title).toContain('RI&E')
    expect(rieMetadata.description).toContain('Binnenkort beschikbaar')
  })
})
