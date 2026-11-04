import { JSDOM } from 'jsdom'
import { publicHomepageContent } from '@/content/public-homepage'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PublicHomepageV02 } from './public-homepage-v02'
import { publicRoutes } from '@/content/public-routes'

describe('homepage hero actions', () => {
  it('preserves both destinations and gives the secondary action an outline', () => {
    const html = renderToStaticMarkup(<PublicHomepageV02 />)
    const links = [...html.matchAll(/<a\b([^>]*)>(.*?)<\/a>/g)]
    const primary = links.find(link => link[2] === 'Start uw opdracht')
    const secondary = links.find(link => link[2] === 'Ontdek eerst wat u nodig heeft')
    expect(primary?.[1]).toContain(`href="${publicRoutes.adviceGuide}"`)
    expect(primary?.[1]).toContain('bg-brand-primary text-text-on-dark')
    expect(secondary?.[1]).toContain('href="#advieswijzer"')
    expect(secondary?.[1]).toContain('border border-border bg-surface text-brand-dark')
    expect(secondary?.[1]).toContain('hover:border-brand-primary hover:bg-brand-primary-subtle')
    expect(secondary?.[1]).toContain('min-h-11')
    expect(secondary?.[1]).not.toContain('bg-transparent')
    expect(html).toContain('id="advieswijzer"')
  })
})


describe('compact homepage content contract', () => {
  function document() {
    return new JSDOM(renderToStaticMarkup(<PublicHomepageV02 />)).window.document
  }

  it('keeps the four process steps and optional invitation text without a duplicate action', () => {
    const page = document()
    const section = [...page.querySelectorAll('section')].find(section =>
      section.querySelector('h2')?.textContent === 'Van hulpvraag naar opdrachtnemer',
    )!
    const steps = [...section.querySelectorAll('ol > li')]
    expect(steps).toHaveLength(4)
    expect(steps.map(step => ({
      title: step.querySelector('h3')?.textContent,
      description: step.querySelector('p')?.textContent,
    }))).toEqual(publicHomepageContent.steps)
    expect(section.textContent).toContain('Selecteer externe ondersteuners die u voor de opdracht wilt uitnodigen.')
    expect(section.querySelector('a, button')).toBeNull()
    expect(page.querySelector('section a')?.getAttribute('href')).toBe(publicRoutes.adviceGuide)
    expect(page.querySelector('section a')?.textContent).toBe('Start uw opdracht')
  })

  it('preserves exactly the six expertise destinations and the overview action', () => {
    const page = document()
    const section = [...page.querySelectorAll('section')].find(section =>
      section.querySelector('h2')?.textContent === 'Deskundigheid voor verschillende Arbo- en veiligheidsvragen',
    )!
    expect([...section.querySelectorAll('li a')].map(link => link.getAttribute('href'))).toEqual([
      publicRoutes.rieService, publicRoutes.safetyExpertService,
      publicRoutes.occupationalHygienistService, publicRoutes.ergonomistService,
      publicRoutes.occupationalPhysicianService, publicRoutes.incidentInvestigationService,
    ])
    expect(section.querySelector('a[href="/diensten"]')?.textContent).toBe('Bekijk alle deskundigheden')
  })

  it('preserves section order, heading hierarchy and both existing entry routes', () => {
    const page = document()
    expect(page.querySelectorAll('h1')).toHaveLength(1)
    expect([...page.querySelectorAll('section')].map(section => section.querySelector('h1,h2')?.textContent)).toEqual([
      'Vind de juiste deskundige voor uw vraag',
      'Van hulpvraag naar opdrachtnemer',
      'Deskundigheid voor verschillende Arbo- en veiligheidsvragen',
      'Waarom organisaties WorkMatchr gebruiken',
      'Eerst begrijpen. Dan de juiste expertise.',
      'Wat moet uw organisatie regelen?',
      'Inzicht voor uw volgende stap',
      'Praktische Arbo-opleidingen',
      'Uw volgende arbovraag begint hier',
    ])
    for (const start of ['deskundigheid', 'onderwerp']) {
      expect(page.querySelectorAll(`a[href="${publicRoutes.adviceGuide}?start=${start}"]`)).toHaveLength(2)
    }
  })
})
