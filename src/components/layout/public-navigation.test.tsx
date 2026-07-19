import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/kenniscentrum' }))

import { PublicNavigation, isPublicNavigationItemActive } from './public-navigation'
import { publicNavigationItems, publicRoutes } from '@/content/public-routes'

describe('publieke navigatie', () => {
  it('markeert de actieve route in desktop- en mobiele navigatie', () => {
    const html = renderToStaticMarkup(<PublicNavigation />)
    expect(html.match(/aria-current="page"/g)).toHaveLength(2)
    expect(html.match(/href="\/kenniscentrum"/g)).toHaveLength(2)
    expect(html).toContain('Hoofdnavigatie openen of sluiten')
  })

  it('biedt dezelfde volledige routeconfiguratie op desktop en mobiel', () => {
    const html = renderToStaticMarkup(<PublicNavigation />)
    for (const item of publicNavigationItems) {
      expect(html.match(new RegExp(`href="${item.href}"`, 'g'))).toHaveLength(2)
      expect(html.match(new RegExp(`>${item.label}<`, 'g'))).toHaveLength(2)
    }
    expect(html).toContain('Stel uw vraag')
    expect(html).not.toContain('Voor specialisten')
    expect(html).not.toContain('href="#"')
  })

  it('normaliseert geneste routes, trailing slashes, querystrings en hashes', () => {
    expect(isPublicNavigationItemActive('/diensten/rie', publicRoutes.services)).toBe(true)
    expect(isPublicNavigationItemActive('/diensten/rie/?bron=menu#inhoud', publicRoutes.services)).toBe(true)
    expect(isPublicNavigationItemActive('/kenniscentrum/', publicRoutes.knowledge)).toBe(true)
    expect(isPublicNavigationItemActive('/sectoren-extra', publicRoutes.sectors)).toBe(false)
    expect(isPublicNavigationItemActive('/', '/#situaties')).toBe(false)
  })
})
