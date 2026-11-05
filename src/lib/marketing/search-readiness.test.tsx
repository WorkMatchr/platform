import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { searchIndexingHeaders, nonIndexableRoutePrefixes } from '@/config/search-indexing'
import { breadcrumbData } from './breadcrumb-data'
import { publicRoutes, indexablePublicRoutes } from '@/content/public-routes'
import { createPublicContentMetadata } from '@/content/public-metadata'
import { services } from '@/content/services'
import { obligations } from '@/content/obligations'
import { sectors } from '@/content/sectors'
import { knowledgeArticles } from '@/content/knowledge/articles'
const allDetailContent = [...services, ...obligations, ...sectors, ...knowledgeArticles]
import sitemap from '@/app/sitemap'
import Clients from '@/app/voor-opdrachtgevers/page'
import Professionals from '@/app/voor-professionals/page'

describe('launch SEO', () => {
  it.each([undefined, 'preview', 'development', 'unknown'])('closes indexing for environment %s', environment => {
    expect(searchIndexingHeaders(environment)).toEqual([{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] }])
  })
  it('keeps private and unreleased scopes out of indexing without blocking public acquisition routes', () => {
    const rules = searchIndexingHeaders('production')
    for (const path of ['/platformbeheer', '/account', '/offertes', '/e-learning', '/wijzers/compliance/v2']) expect(rules.some(rule => rule.source === `${path}/:path*`)).toBe(true)
    for (const path of indexablePublicRoutes) expect((nonIndexableRoutePrefixes as readonly string[]).some(prefix => path === prefix || path.startsWith(`${prefix}/`))).toBe(false)
    const entries = sitemap().map(entry => entry.url)
    expect(new Set(entries).size).toBe(entries.length)
    expect(entries).toContain('https://www.workmatchr.nl/contact')
    expect(entries.some(url => /[?#]|e-learning|platformbeheer/.test(url))).toBe(false)
  })
  it('keeps canonical, Open Graph and visible breadcrumb data consistent and injection safe', () => {
    for (const content of allDetailContent) {
      const meta = createPublicContentMetadata(content)
      expect(meta.alternates?.canonical).toBe(content.href)
      expect(meta.openGraph).toMatchObject({ url: content.href, locale: 'nl_NL', siteName: 'WorkMatchr' })
    }
    const serialized = breadcrumbData([{ label: 'Home', href: '/' }, { label: '</script><script>bad</script>' }])
    expect(serialized).not.toContain('<')
    const data = JSON.parse(serialized)
    expect(data['@type']).toBe('BreadcrumbList')
    expect(data.itemListElement[0]).toMatchObject({ position: 1, item: 'https://www.workmatchr.nl/' })
    expect(data.itemListElement[1]).toEqual({ '@type': 'ListItem', position: 2, name: '</script><script>bad</script>' })
  })
  it('reuses existing landing routes and preserves honest availability and CTA language', () => {
    const clients = renderToStaticMarkup(<Clients />); const professionals = renderToStaticMarkup(<Professionals />)
    for (const href of [publicRoutes.rieService, publicRoutes.safetyExpertService, publicRoutes.preventionOfficerService, publicRoutes.incidentInvestigationService, publicRoutes.services, publicRoutes.complianceScan]) expect(clients).toContain(`href="${href}"`)
    expect(clients).toContain('Start uw opdracht')
    expect(professionals).toContain('geen garantie op werk of omzet')
    expect(professionals).toContain('/registreren?accountType=PROFESSIONAL')
    expect(clients.match(/<h1[ >]/g)).toHaveLength(1)
  })
})
