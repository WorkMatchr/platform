import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({ pathname: '/platformbeheer/financien/betalingen/payment-id' }))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}))

import { isPlatformAdminRouteActive, PlatformAdminNavigationMenu } from './platform-admin-navigation-menu'

describe('inklapbare platformbeheernavigatie', () => {
  it('opent de actieve groep en markeert de meest passende route', () => {
    const html = renderToStaticMarkup(<PlatformAdminNavigationMenu membershipRole="ADMIN" />)
    const finance = html.slice(html.indexOf('Financieel'), html.indexOf('Systeem'))
    expect(finance).toContain('aria-current="page"')
    expect(finance).toContain('Betalingen')
    expect(html.match(/open=""/g)).toHaveLength(1)
  })

  it('herkent detailroutes zonder het dashboard op iedere beheerroute actief te maken', () => {
    expect(isPlatformAdminRouteActive('/platformbeheer/organisaties/123/gebruikers', '/platformbeheer/organisaties')).toBe(true)
    expect(isPlatformAdminRouteActive('/platformbeheer/organisaties/123', '/platformbeheer')).toBe(false)
  })

  it('geeft een geneste systeemroute voorrang boven de bredere Marketplace-route', () => {
    navigation.pathname = '/platformbeheer/marketplace/regels'
    const html = renderToStaticMarkup(<PlatformAdminNavigationMenu membershipRole="ADMIN" />)
    const systemStart = html.lastIndexOf('<details', html.indexOf('Systeem'))
    const system = html.slice(systemStart)
    expect(system).toMatch(/^<details[^>]*open=""/)
    expect(system).toContain('aria-current="page"')
    expect(system).toContain('Bedrijfsregels')
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
  })

  it('wisselt de vijf beheergroepen volgens A-B-A-B-A af', () => {
    navigation.pathname = '/platformbeheer'
    const html = renderToStaticMarkup(<PlatformAdminNavigationMenu membershipRole="ADMIN" />)
    const summaries = [...html.matchAll(/<summary class="([^"]+)"/g)].map((match) => match[1])

    expect(summaries).toHaveLength(5)
    expect(summaries.map((classes) => classes.includes('border-sky-200 bg-sky-50'))).toEqual([
      true,
      false,
      true,
      false,
      true,
    ])
    expect(summaries[1]).toContain('border-slate-200 bg-slate-50')
    expect(summaries[3]).toContain('border-slate-200 bg-slate-50')
  })
})
