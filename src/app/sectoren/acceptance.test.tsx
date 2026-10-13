import { renderToStaticMarkup as render } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Page, { metadata } from './page'
import Detail, { generateMetadata, generateStaticParams } from './[slug]/page'
import sitemap from '../sitemap'
import { sectors } from '@/content/sectors'
import { resolvePublicSources } from '@/content/public-sources'
import { getPublicContentItem } from '@/content/public-content'

describe('A04 sectorenacceptatie', () => {
  it('behoudt exact zes unieke sectorroutes en presenteert beschikbare inhoud', () => {
    const html = render(<Page />)
    expect(sectors).toHaveLength(6)
    expect(new Set(sectors.map(s => s.href)).size).toBe(6)
    expect(generateStaticParams().map(s => s.slug)).toEqual(sectors.map(s => s.slug))
    expect(html).not.toContain('onderwerpen volgen')
    expect(html).toContain('Start uw opdracht')
    expect(metadata.alternates?.canonical).toBe('/sectoren')
    for (const sector of sectors) expect(html).toContain(`href="${sector.href}"`)
  })
  it.each(sectors.map(s => [s.slug, s] as const))('%s behoudt inhoud, bronnen, navigatie en SEO', async (_, sector) => {
    const html = render(await Detail({ params: Promise.resolve({ slug: sector.slug }) }))
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html.match(/>Start uw opdracht<\/a>/g)).toHaveLength(1)
    expect(html).toContain('href="/opdracht-starten"')
    expect(html).toContain('href="/sectoren"')
    expect(html).toContain('Bronnen en onderbouwing')
    expect(html).toContain('[&amp;_a.group]:text-brand-primary-hover')
    expect(html).toContain(sector.nuance.replaceAll('&', '&amp;'))
    expect(sector.faq).toHaveLength(2)
    expect(new Set(sector.faq.map(f => f.id)).size).toBe(2)
    expect(resolvePublicSources(sector.sourceIds)).toHaveLength(sector.sourceIds.length)
    for (const id of [...sector.serviceIds, ...sector.obligationIds]) expect(getPublicContentItem(id)).toBeTruthy()
    expect((await generateMetadata({ params: Promise.resolve({ slug: sector.slug }) })).alternates?.canonical).toBe(sector.href)
    expect(sitemap().filter(entry => new URL(entry.url).pathname === sector.href)).toHaveLength(1)
  })
})
