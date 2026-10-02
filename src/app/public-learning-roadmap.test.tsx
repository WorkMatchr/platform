import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'
import ElearningPage from './e-learning/page'
import RoadmapLearningPage, { generateMetadata, generateStaticParams } from './e-learning/[slug]/page'
import { publicLearningCatalog, publicLearningCategories, publicLearningHref, roadmapLearningCourses } from '@/content/public-learning-catalog'
import { publicLearningPrices } from '@/content/public-learning-prices'
import { publicLearning } from '@/content/public-learning'
import { indexablePublicRoutes, isRegisteredPublicHref } from '@/content/public-routes'
import sitemap from './sitemap'

vi.mock('@/lib/auth', () => { throw new Error('Public roadmap must not use auth') })
vi.mock('@/lib/prisma', () => { throw new Error('Public roadmap must not use a database') })
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND') } }))

const expectedSlugs = [
  'preventiemedewerker-in-de-praktijk', 'veilig-en-gezond-werken',
  'ongevallen-en-gevaarlijke-situaties-melden', 'werkdruk-en-ongewenst-gedrag',
  'fysieke-belasting', 'gevaarlijke-stoffen-basis', 'veilig-werken-met-machines',
  'beeldschermwerk-en-ergonomie', 'veiligheid-voor-leidinggevenden',
  'bhv-awareness', 'werken-op-hoogte-awareness',
]
const doc = (html: string) => new JSDOM(html).window.document

function expectInformationOnly(document: Document) {
  expect(document.querySelector('form')).toBeNull()
  for (const link of document.querySelectorAll('a')) {
    expect(link.getAttribute('href')).not.toMatch(/checkout|enroll|e-learnings|retention|aanmelden|registreren/)
    expect(link.textContent).not.toMatch(/Koop nu|Inschrijven|Start opleiding|Nu starten/i)
  }
  expect(document.body.textContent).not.toMatch(/DRAFT|PUBLISHED_PROTOTYPE|RETIRED|inclusief btw|exclusief btw/i)
  expect(document.querySelector('script[type="application/ld+json"]')).toBeNull()
}

describe('Public Learning roadmap', () => {
  it('registreert exact de elf afgesproken slugs naast de specifieke WL-001-pagina', () => {
    expect(roadmapLearningCourses.map(course => course.slug).sort()).toEqual([...expectedSlugs].sort())
    expect(publicLearningCatalog).toHaveLength(12)
    expect(new Set(publicLearningCatalog.map(course => course.code)).size).toBe(12)
    expect(generateStaticParams().map(item => item.slug).sort()).toEqual([...expectedSlugs].sort())
    expect(publicLearningCatalog[0]).toMatchObject({ title: publicLearning.title, status: 'Binnenkort beschikbaar', topics: publicLearning.chapters })
    expect(publicLearningPrices).toEqual({ individualPrice: '€149', teamPrice: '€595' })
    for (const course of publicLearningCatalog) expect(course).toMatchObject(publicLearningPrices)
  })

  it('toont categorieën en kaarten in afgesproken volgorde met complete uniforme prijsinformatie', () => {
    const document = doc(renderToStaticMarkup(<ElearningPage />))
    const expectedCodes = [
      ['WL-001', 'WL-002', 'WL-010'],
      ['WL-003', 'WL-005', 'WL-006', 'WL-009', 'WL-011'],
      ['WL-004', 'WL-007', 'WL-008', 'WL-012'],
    ]
    publicLearningCategories.forEach((category, index) => {
      const section = document.querySelector(`[aria-labelledby="learning-${category.key}"]`)!
      expect(section.querySelector('h3')?.textContent).toBe(category.title)
      expect([...section.querySelectorAll('h4')].map(heading => heading.textContent)).toEqual(
        expectedCodes[index].map(code => publicLearningCatalog.find(course => course.code === code)!.title),
      )
    })
    expect(document.querySelectorAll('#aanbod h4')).toHaveLength(12)
    for (const course of publicLearningCatalog) {
      const link = document.querySelector(`#aanbod a[href="${publicLearningHref(course)}"]`)!
      expect(link.textContent).toContain('Bekijk opleiding')
      const card = link.parentElement!
      for (const value of [course.title, course.audience, course.duration, course.status, '€149', '€595', '5 deelnemers']) {
        expect(card.textContent).toContain(value)
      }
    }
    expectInformationOnly(document)
  })

  it.each(expectedSlugs)('rendert %s publiek, met eigen SEO, voorlopige inhoud en uitsluitend informatieve CTA’s', async slug => {
    const params = Promise.resolve({ slug })
    const document = doc(renderToStaticMarkup(await RoadmapLearningPage({ params })))
    const course = roadmapLearningCourses.find(item => item.slug === slug)!
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    expect(document.querySelector('h1')?.textContent).toBe(course.title)
    for (const text of ['In ontwikkeling', 'Voorlopige opleidingsopzet', 'Indicatieve duur:', course.audience, '€149', '€595', 'toets- en certificaatvorm']) {
      expect(document.body.textContent).toContain(text)
    }
    const header = document.querySelector('h1')!.closest('header')!
    expect(header).not.toBeNull()
    for (const value of [course.title, 'In ontwikkeling', course.audience, course.duration, '€149 per deelnemer', '€595 voor 5 deelnemers', 'De opleiding is nog niet beschikbaar voor inschrijving.']) {
      expect(header.textContent).toContain(value)
    }
    expect(document.querySelector('#outcomes-title')?.textContent).toBe('Wat leert u?')
    expect(document.body.textContent).toContain('Dit zijn de beoogde leeruitkomsten.')
    expect(document.body.textContent).toContain('De inhoud en opbouw kunnen tijdens de ontwikkeling nog worden aangescherpt.')
    for (const topic of course.topics) expect(document.body.textContent).toContain(topic)
    if (course.disclaimer) expect(document.body.textContent).toContain(course.disclaimer)
    expect(document.querySelector('a[href="/e-learning#aanbod"]')).not.toBeNull()
    expectInformationOnly(document)
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toBe(`${course.title} — in ontwikkeling | WorkMatchr`)
    expect(metadata.description).toContain('In ontwikkeling')
    expect(metadata.alternates).toEqual({ canonical: publicLearningHref(course) })
    expect(metadata.openGraph).toMatchObject({ url: publicLearningHref(course) })
    expect(indexablePublicRoutes.filter(route => route === publicLearningHref(course))).toHaveLength(1)
    expect(sitemap().filter(entry => new URL(entry.url).pathname === publicLearningHref(course))).toHaveLength(1)
    expect(isRegisteredPublicHref(publicLearningHref(course))).toBe(true)
  })

  it('geeft voor een onbekende of object-prototype-slug een 404 in pagina én metadata', async () => {
    for (const slug of ['onbekend', 'constructor', '__proto__']) {
      await expect(RoadmapLearningPage({ params: Promise.resolve({ slug }) })).rejects.toThrow('NEXT_NOT_FOUND')
      await expect(generateMetadata({ params: Promise.resolve({ slug }) })).rejects.toThrow('NEXT_NOT_FOUND')
    }
  })

  it('houdt twaalf unieke detailroutes en unieke metadatatitels zonder dubbele sitemapregels', async () => {
    const learningRoutes = sitemap().map(entry => new URL(entry.url).pathname).filter(path => path.startsWith('/e-learning/'))
    expect(learningRoutes).toHaveLength(12)
    expect(new Set(learningRoutes).size).toBe(12)
    const titles = await Promise.all(expectedSlugs.map(async slug => (await generateMetadata({ params: Promise.resolve({ slug }) })).title))
    expect(new Set(titles).size).toBe(11)
  })
})
