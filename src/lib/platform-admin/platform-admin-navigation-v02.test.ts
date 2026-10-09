import { describe, expect, it } from 'vitest'
import { readdirSync } from 'node:fs'
import { platformAdminNavigation } from './platform-admin-navigation'
import { getPlatformAdminActiveItem, getPlatformAdminChapters, platformAdminChapters } from './platform-admin-navigation-v02'

describe('Platformbeheer v0.2 navigation', () => {
  it('retains every v0.1 navigation destination in seven chapters', () => {
    const routes = platformAdminChapters.flatMap((chapter) => chapter.items.map((item) => item.href))
    expect(platformAdminChapters).toHaveLength(7)
    expect(new Set(routes).size).toBe(routes.length)
    for (const item of platformAdminNavigation) expect(routes).toContain(item.href)
  })
  it('classifies every existing page including detail screens', () => {
    const files = readdirSync('src/app/platformbeheer', { recursive: true }) as string[]
    for (const file of files.filter((file) => /(^|[\\/])page.tsx$/.test(file))) {
      const route = '/platformbeheer' + file.replaceAll('\\', '/').replace(/(^|\/)page.tsx$/, '').replace(/^(.+)$/, '/$1').replace(/\[[^\]]+\]/g, 'example-id')
      expect(getPlatformAdminActiveItem(route, 'OWNER'), route).toBeDefined()
    }
  })
  it('keeps prices, subscriptions, payments and credits together', () => {
    for (const path of ['/financien', '/financien/facturen/123', '/marketplace/regels', '/dienstverleners/123/credits']) {
      expect(getPlatformAdminActiveItem('/platformbeheer' + path, 'ADMIN')?.chapter.label).toBe('Financieel')
    }
  })
  it('selects the most specific page and excludes prefix lookalikes', () => {
    expect(getPlatformAdminActiveItem('/platformbeheer/marketplace/betrouwbaarheid/123', 'ADMIN')?.chapter.label).toBe('Opdrachten & dienstverlening')
    expect(getPlatformAdminActiveItem('/platformbeheer/financien/facturen', 'ADMIN')?.item.label).toBe('Facturen')
    expect(getPlatformAdminActiveItem('/platformbeheer/financien-extra', 'ADMIN')).toBeUndefined()
  })
  it('restricts auditor navigation to the existing audit destination', () => {
    expect(getPlatformAdminChapters('MEMBER').flatMap((entry) => entry.items.map((item) => item.href))).toEqual(['/platformbeheer/auditor'])
    expect(getPlatformAdminActiveItem('/platformbeheer/financien', 'MEMBER')).toBeUndefined()
  })
})
