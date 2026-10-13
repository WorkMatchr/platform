import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ServicesPage, { metadata as overviewMetadata } from './page'
import ServicePage, { generateMetadata, generateStaticParams } from './[slug]/page'
import RiePage, { metadata as rieMetadata } from './rie/page'
import sitemap from '../sitemap'
import { services } from '@/content/services'
import { expertiseOverview, serviceOverview } from '@/content/public-overviews'
import { resolvePublicSources } from '@/content/public-sources'
import { ServiceOverviewList } from '@/components/public/service-overview-list'

const render = renderToStaticMarkup
const startLinks = (html: string) => [...html.matchAll(/<a\b[^>]*href="\/opdracht-starten"[^>]*>(.*?)<\/a>/g)].map(match => match[1])

describe('A02 dienstenacceptatie', () => {
  it('toont exact 22 unieke cataloguslinks, zonder ontbrekende of extra bestemming', () => {
    const items = [...serviceOverview, ...expertiseOverview]
    const html = render(<ServiceOverviewList items={items} />)
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1])
    expect(hrefs).toHaveLength(22)
    expect(new Set(hrefs).size).toBe(22)
    expect([...hrefs].sort()).toEqual(services.map(service => service.href).sort())
    expect(generateStaticParams().map(item => item.slug).sort()).toEqual(services.filter(item => item.slug !== 'rie').map(item => item.slug).sort())
  })

  it('gebruikt één uniforme opdrachtstart en behoudt de informatiegerichte E-learninglink', () => {
    const html = render(<ServicesPage />)
    expect(startLinks(html)).toEqual(['Start uw opdracht'])
    expect(html).toContain('>Bekijk E-learning</a>')
    expect(html).toContain('href="/e-learning"')
  })

  it('indexeert overzicht en alle detailroutes exact eenmaal met passende metadata', async () => {
    const entries = sitemap().map(entry => new URL(entry.url).pathname)
    const pages = [{ href: '/diensten', metadata: overviewMetadata }, ...await Promise.all(services.map(async service => ({
      href: service.href!, metadata: service.slug === 'rie' ? rieMetadata : await generateMetadata({ params: Promise.resolve({ slug: service.slug }) }),
    })))]
    for (const page of pages) {
      expect(entries.filter(path => path === page.href), page.href).toHaveLength(1)
      expect(page.metadata.alternates?.canonical, page.href).toBe(page.href)
      expect(page.metadata.openGraph?.url, page.href).toBe(page.href)
      expect(page.metadata.title, page.href).toContain('WorkMatchr')
      expect(page.metadata.description?.trim().length, page.href).toBeGreaterThan(20)
      expect(page.metadata.robots, page.href).toBeUndefined()
    }
  })

  it.each(services.map(service => [service.slug, service] as const))('%s behoudt bronnen, unieke FAQ, één H1 en één opdrachtstart', async (_slug, service) => {
    const html = render(service.slug === 'rie' ? <RiePage /> : await ServicePage({ params: Promise.resolve({ slug: service.slug }) }))
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(startLinks(html)).toEqual(['Start uw opdracht'])
    expect(html).toContain('id="faq-title"')
    expect(new Set(service.faq.map(item => item.id)).size).toBe(service.faq.length)
    expect(new Set(service.faq.map(item => item.question)).size).toBe(service.faq.length)
    expect(service.faq.every(item => item.question.trim() && item.answer.trim())).toBe(true)
    expect(html.indexOf('id="faq-title"')).toBeLessThan(html.indexOf('id="public-content-cta-title"'))
    expect(html.indexOf('id="public-content-cta-title"')).toBeLessThan(html.indexOf('id="sources-title"'))
    const sources = resolvePublicSources(service.sourceIds)
    expect(sources.length).toBe(service.sourceIds.length)
    expect(sources.length).toBeGreaterThan(0)
    for (const source of sources) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.publisher).toBeTruthy()
      expect(source.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(html).toContain(`href="${source.url.replaceAll('&', '&amp;')}"`)
    }
    expect(html).toContain('Algemene vakinformatie')
    expect(html).toContain('Bronnen en onderbouwing')
  })
})
