import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Footer } from '@/components/layout/footer'
import { siteConfig } from '@/config/site'
import {
  indexablePublicRoutes,
  publicFooterGroups,
  publicNavigationItems,
  publicRoutes,
} from '@/content/public-routes'
import { publicContentCatalog } from '@/content/public-content'
import NotFound from './not-found'
import robots from './robots'
import sitemap from './sitemap'

function routePageExists(route: string) {
  if (route === '/') return existsSync(join(process.cwd(), 'src/app/page.tsx'))
  return existsSync(join(process.cwd(), 'src/app', route.slice(1), 'page.tsx'))
}

describe('publieke informatiearchitectuur', () => {
  it('registreert uitsluitend unieke, bestaande routes', () => {
    const routes = Object.values(publicRoutes)
    expect(new Set(routes)).toHaveLength(routes.length)
    expect(routes.every(routePageExists)).toBe(true)
  })

  it('laat navigatie en footer uitsluitend naar geregistreerde doelen verwijzen', () => {
    const registeredRoutes = new Set<string>(Object.values(publicRoutes))
    const registeredAnchors = new Set<string>(['/#situaties'])
    const allHrefs: string[] = [
      ...publicNavigationItems.map((item) => item.href),
      ...publicFooterGroups.flatMap((group) => group.links.map((item) => item.href)),
    ]
    expect(allHrefs.every((href) => registeredRoutes.has(href) || registeredAnchors.has(href))).toBe(true)
  })

  it('rendert een consistente footer met account- en juridische routes', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('Vind uw route')
    expect(html).toContain('href="/privacy"')
    expect(html).toContain('href="/algemene-voorwaarden"')
    expect(html).toContain('href="/inloggen"')
    expect(html).not.toContain('href="#"')
  })

  it('legt de RI&E-content getypeerd en met stabiele identiteiten vast', () => {
    const rieItems = [
      publicContentCatalog['knowledge:rie-required'],
      publicContentCatalog['service:rie'],
      publicContentCatalog['obligation:rie'],
    ]
    expect(rieItems.map((item) => item.type)).toEqual([
      'knowledge',
      'service',
      'obligation',
    ])
    expect(new Set(rieItems.map((item) => item.id))).toHaveLength(3)
    expect(new Set(rieItems.map((item) => item.href))).toHaveLength(3)
  })

  it('neemt alleen inhoudelijke publieke routes op in de sitemap', () => {
    const entries = sitemap()
    expect(entries).toHaveLength(indexablePublicRoutes.length)
    expect(entries.map((entry) => entry.url)).toEqual(
      indexablePublicRoutes.map((route) => new URL(route, siteConfig.url).toString()),
    )
    expect(entries.some((entry) => entry.url.includes('/dashboard'))).toBe(false)
    expect(entries.some((entry) => entry.url.includes('/inloggen'))).toBe(false)
  })

  it('publiceert robots-regels vanuit de centrale siteconfiguratie', () => {
    const rules = robots()
    expect(rules.sitemap).toBe(`${siteConfig.url}/sitemap.xml`)
    expect(rules.rules).toMatchObject({ userAgent: '*', allow: '/' })
    expect(JSON.stringify(rules.rules)).toContain('/aanbiedersdossier')
  })

  it('biedt op de 404-pagina bruikbare vervolgroutes', () => {
    const html = renderToStaticMarkup(<NotFound />)
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html).toContain('Deze pagina kunnen we niet vinden')
    expect(html).toContain('href="/"')
    expect(html).toContain('href="/#situaties"')
    expect(html).toContain('href="/kenniscentrum"')
  })

  it('bevat geen hardcoded publieke navigatie meer in de homepagecontent', () => {
    const source = readFileSync(join(process.cwd(), 'src/content/public-homepage.ts'), 'utf8')
    expect(source).not.toContain('export const publicNavigation =')
    expect(source).not.toContain('export const publicFooterGroups =')
  })
})
