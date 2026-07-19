import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  publicContentCatalog,
  publicContentRelations,
  resolvePublicContentCta,
  resolvePublicContentRelations,
  resolveRelatedPublicContent,
  validatePublicContentArchitecture,
  type PublicContentRelation,
} from './public-content'

function routePageExists(route: string) {
  const segments = route.slice(1).split('/')
  return existsSync(join(process.cwd(), 'src/app', ...segments, 'page.tsx')) ||
    (segments.length === 2 && existsSync(join(process.cwd(), 'src/app', segments[0]!, '[slug]', 'page.tsx')))
}

describe('publieke contentcatalogus en relaties', () => {
  it('bevat unieke stabiele ID’s en uitsluitend bestaande indexeerbare routes', () => {
    const items = Object.values(publicContentCatalog)
    expect(new Set(items.map((item) => item.id))).toHaveLength(items.length)
    expect(new Set(items.map((item) => item.href))).toHaveLength(items.length)
    expect(items.every((item) => routePageExists(item.href))).toBe(true)
    expect(items.every((item) => item.indexable && item.status === 'PUBLISHED')).toBe(true)
    expect(items.some((item) => /dashboard|organisatie|aanbiedersdossier|inloggen/.test(item.href))).toBe(false)
  })

  it('valideert de actuele architectuur zonder fouten', () => {
    expect(validatePublicContentArchitecture()).toEqual([])
  })

  it('faalt gesloten bij ontbrekende, verkeerd getypeerde, dubbele en zelfgerichte relaties', () => {
    const invalidRelations = {
      ...publicContentRelations,
      'knowledge:rie-required': [
        { target: { id: 'knowledge:rie-required', type: 'knowledge' }, purpose: 'explanation' },
        { target: { id: 'service:rie', type: 'knowledge' }, purpose: 'support' },
        { target: { id: 'service:rie', type: 'service' }, purpose: 'support' },
        { target: { id: 'service:rie', type: 'service' }, purpose: 'support' },
        { target: { id: 'missing:content', type: 'knowledge' }, purpose: 'explanation' },
      ] as unknown as readonly PublicContentRelation[],
    }
    const issues = validatePublicContentArchitecture(publicContentCatalog, invalidRelations)
    expect(issues.some((issue) => issue.includes('verwijst naar zichzelf'))).toBe(true)
    expect(issues.some((issue) => issue.includes('onjuist type'))).toBe(true)
    expect(issues.some((issue) => issue.includes('dubbele relaties'))).toBe(true)
    expect(issues.some((issue) => issue.includes('ontbrekende content'))).toBe(true)
  })

  it('legt het volledige directionele RI&E-cluster expliciet vast', () => {
    const expectedTargets = {
      'knowledge:rie-required': ['obligation:rie', 'service:rie', 'sector:bouw', 'tool:advice-guide'],
      'obligation:rie': ['knowledge:rie-required', 'service:rie', 'sector:bouw', 'tool:advice-guide'],
      'service:rie': ['knowledge:rie-required', 'obligation:rie', 'sector:bouw', 'tool:advice-guide'],
    } as const

    for (const [sourceId, targetIds] of Object.entries(expectedTargets)) {
      expect(resolvePublicContentRelations(sourceId as keyof typeof expectedTargets).map((item) => item.id)).toEqual(targetIds)
    }
  })

  it('gebruikt per RI&E-pagina twee hiërarchische CTA’s en hoogstens twee aanvullende items', () => {
    for (const id of ['knowledge:rie-required', 'obligation:rie', 'service:rie'] as const) {
      const cta = resolvePublicContentCta(id)
      const related = resolveRelatedPublicContent(id)
      expect(cta?.primary.href).toBeTruthy()
      expect(cta?.secondary?.href).toBeTruthy()
      expect(related.length).toBeLessThanOrEqual(2)
      expect(related[0]?.id).not.toBe(id)
      expect([cta?.primary.href, cta?.secondary?.href]).not.toContain(related[0]?.href)
    }
  })

  it('neemt uitsluitend de zes werkelijk gebouwde sectordetailroutes op', () => {
    const sectorItems = Object.values(publicContentCatalog).filter((item) => item.type === 'sector')
    expect(sectorItems).toHaveLength(6)
    expect(sectorItems.every((item) => item.kind === 'detail' && routePageExists(item.href))).toBe(true)
  })
})
