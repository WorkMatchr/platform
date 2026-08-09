import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { publicHomepageContent, publicSituationRouting } from '@/content/public-homepage'
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
    expect(html).toContain('href="/advieswijzer"')
    expect(html).toContain('Ontdek welke ondersteuning u nodig heeft')
    expect(html).toContain('href="/hulpvragen/nieuw"')
    expect(html).toContain('Vraag ondersteuning aan')
    expect(html).not.toContain('Start uw opdracht')
    expect(html).not.toContain('Start de zelfscan')
  })

  it('gebruikt in de hero de definitieve illustratie in plaats van de tijdelijke placeholder', () => {
    const html = renderHomepage()
    expect(html).toContain('hero-begrijpen-en-verbinden.png')
    expect(html).toContain('alt="Van een duidelijke hulpvraag via betrouwbare kennis naar een passende deskundige"')
    expect(html).toContain('width="1536"')
    expect(html).toContain('height="1024"')
    expect(html).toContain('sizes="(min-width: 1024px) 44vw, 100vw"')
    expect(html).toContain('class="h-auto w-full rounded-card object-contain"')
    expect(html).not.toContain('data-homepage-illustration-placeholder')
    expect(html).not.toContain('aria-label="Proces van vraag naar specialist"')
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
    expect(html.match(/data-card-density="compact"/g)).toHaveLength(6)
    expect(html).toContain('grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3')
  })

  it('routeert brede situaties naar informatie en houdt de Advieswijzer afzonderlijk', () => {
    const html = renderHomepage()

    expect(publicSituationRouting).toEqual({
      'employer-with-staff': {
        href: '/wettelijke-verplichtingen',
        destinationType: 'information',
      },
      'rie-uncertainty': {
        href: '/kenniscentrum/moet-ik-een-rie-hebben',
        destinationType: 'information',
      },
      'occupational-health-obligations': {
        href: '/wettelijke-verplichtingen',
        destinationType: 'information',
      },
      'incident-or-near-miss': {
        href: '/kenniscentrum/wanneer-incidentonderzoek-zinvol',
        destinationType: 'information',
      },
      'absence-or-health-concerns': {
        href: '/kenniscentrum/wanneer-bedrijfsarts-inschakelen',
        destinationType: 'information',
      },
      'find-an-expert': {
        href: '/diensten',
        destinationType: 'services',
      },
    })
    expect(publicHomepageContent.situations.map((situation) => situation.href)).not.toContain('/advieswijzer')
    expect(html).toMatch(
      /Ik heb personeel in dienst[\s\S]*href="\/wettelijke-verplichtingen"[\s\S]*Bekijk wat u moet regelen/,
    )
    expect(html).toContain('Ik weet nog niet wat ik nodig heb')
    expect(html).toContain(
      'Beantwoord enkele korte vragen. WorkMatchr helpt u uw hulpvraag duidelijk te maken.',
    )
    expect(html).toMatch(/href="\/advieswijzer"[\s\S]*Start de advieswijzer/)
  })

  it('gebruikt vier begrijpelijke proceslabels in de bedoelde volgorde', () => {
    const html = renderHomepage()
    const labels = ['Vertel uw situatie', 'Wij verduidelijken uw vraag', 'Ontvang algemene vakinformatie', 'Vind de juiste deskundige']

    expect(publicHomepageContent.process).toEqual(labels)
    for (const label of labels) expect(html).toContain(label)
    expect(html).not.toContain('>Verduidelijking<')
    expect(html).not.toContain('>Inzicht<')
  })

  it('plaatst procesuitleg en daarna verplichtingen en kennis direct na de hero', () => {
    const html = renderHomepage()
    const process = html.indexOf('Van vraag naar een passende vervolgstap')
    const obligations = html.indexOf('Wat moet uw organisatie regelen?')
    const knowledge = html.indexOf('Een onderbouwd antwoord op uw vraag')
    const situations = html.indexOf('Waar loopt u tegenaan?')

    expect(process).toBeGreaterThan(0)
    expect(process).toBeLessThan(obligations)
    expect(obligations).toBeLessThan(knowledge)
    expect(knowledge).toBeLessThan(situations)
    expect(html).toContain('grid items-stretch gap-6 lg:grid-cols-2')
    expect(html).toContain('Bekijk alle verplichtingen')
    expect(html).toContain('Ga naar het kenniscentrum')
    expect(html.match(/aria-roledescription="carousel"/g)).toHaveLength(2)
    expect(html).toContain('aria-label="Positie 1 van 10"')
    expect(html).toContain('aria-label="Positie 1 van 9"')
    expect(html).toContain('aria-label="Kenniscentrumartikelen"')
    expect(html).toContain('p-5 sm:p-6')
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
    expect(hrefs.filter((href) => href.includes('#'))).toEqual(['/#situaties'])
    expect(html).toContain('id="situaties"')
    expect(html).toContain('tabindex="-1"')
  })

  it('toont de publieke overzichten en uitsluitend de gepubliceerde kennisinhoud', () => {
    const html = renderHomepage()
    for (const href of ['/diensten', '/wettelijke-verplichtingen', '/sectoren', '/kenniscentrum']) {
      expect(html).toContain(`href="${href}"`)
    }
    expect(html).toContain('Moet ik een RI&amp;E hebben?')
    expect(html).not.toContain('Zoeken in het kenniscentrum')
  })

  it('rendert vier processtappen en vier vertrouwensprincipes', () => {
    const html = renderHomepage()
    expect(publicHomepageContent.steps).toHaveLength(4)
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
