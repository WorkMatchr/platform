import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { knowledgeArticles } from './knowledge/articles'
import { obligations } from './obligations'
import { publicContentCatalog, publicContentRelations, resolvePublicContentCta, validatePublicContentArchitecture } from './public-content'
import { indexablePublicRoutes, isRegisteredPublicHref } from './public-routes'
import { publicSources, validatePublicSources } from './public-sources'
import { sectors } from './sectors'
import { services } from './services'

const allDetailContent = [...services, ...obligations, ...sectors, ...knowledgeArticles]
function routeExists(route: string) { const segments = route.slice(1).split('/'); return existsSync(join(process.cwd(), 'src/app', ...segments, 'page.tsx')) || existsSync(join(process.cwd(), 'src/app', segments[0]!, '[slug]', 'page.tsx')) }

describe('Public Content Platform v1', () => {
  it('bouwt de afgesproken hoeveelheid hoogwaardige content', () => {
    expect(services).toHaveLength(8)
    expect(obligations).toHaveLength(10)
    expect(sectors).toHaveLength(6)
    expect(knowledgeArticles).toHaveLength(9)
  })

  it('heeft per detailitem unieke identiteit, route en metadata', () => {
    expect(new Set(allDetailContent.map((item) => item.id))).toHaveLength(allDetailContent.length)
    expect(new Set(allDetailContent.map((item) => item.href))).toHaveLength(allDetailContent.length)
    expect(new Set(allDetailContent.map((item) => item.metadata.title))).toHaveLength(allDetailContent.length)
    expect(new Set(allDetailContent.map((item) => item.metadata.description))).toHaveLength(allDetailContent.length)
    for (const item of allDetailContent) {
      expect(item.title && item.summary && item.lastReviewed).toBeTruthy()
      expect(item.faq).toHaveLength(2)
      expect(new Set(item.faq.map((faq) => faq.id))).toHaveLength(item.faq.length)
      expect(item.sourceIds.length).toBeGreaterThan(0)
      expect(item.sourceIds.every((sourceId) => sourceId in publicSources)).toBe(true)
      expect(isRegisteredPublicHref(item.href)).toBe(true)
      expect(routeExists(item.href)).toBe(true)
    }
  })

  it('houdt gespecialiseerde modellen inhoudelijk compleet', () => {
    expect(services.every((item) => item.appropriateWhen.length >= 3 && item.process.length === 4 && item.expertise.length >= 3)).toBe(true)
    expect(obligations.every((item) => item.practicalActions.length >= 4 && item.nuances.length >= 2 && item.legalBasis)).toBe(true)
    expect(sectors.every((item) => item.activities.length >= 3 && item.risks.length >= 3 && item.firstSteps.length >= 3)).toBe(true)
    expect(knowledgeArticles.every((item) => item.shortAnswer && item.context.length >= 2 && item.practicalPoints.length >= 4)).toBe(true)
  })

  it('valideert bronnen, content en relaties fail closed', () => {
    expect(validatePublicSources()).toEqual([])
    expect(validatePublicContentArchitecture()).toEqual([])
    for (const item of allDetailContent) {
      expect(publicContentRelations[item.id]?.length).toBeGreaterThanOrEqual(3)
      expect(publicContentRelations[item.id]?.length).toBeLessThanOrEqual(4)
      const cta = resolvePublicContentCta(item.id)
      expect([cta?.primary.href, cta?.secondary?.href]).toContain('/advieswijzer')
    }
  })

  it('houdt sitemaproutes compleet en vrij van private routes en queryvarianten', () => {
    const routes = new Set<string>(indexablePublicRoutes)
    expect(allDetailContent.every((item) => routes.has(item.href))).toBe(true)
    expect([...routes].some((route) => /account|organisatie|aanbiedersdossier|\?|#/.test(route))).toBe(false)
    expect(Object.values(publicContentCatalog).every((item) => routes.has(item.href))).toBe(true)
  })
})
