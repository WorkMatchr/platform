import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('opdrachtgeversdashboard en opdrachtennavigatie', () => {
  it('toont betrouwbare afgeleide dashboardonderdelen met directe routes', () => {
    const component = read('src/components/marketplace/marketplace-dashboard.tsx')
    const service = read('src/lib/marketplace/dashboard-query-service.ts')

    for (const label of [
      'Actie nodig',
      'Nog invullen',
      'Gepubliceerd',
      'Ontvangen offertes',
      'Actieve adviesdossiers',
      'Ongelezen notificaties',
    ]) {
      expect(component).toContain(label)
    }
    expect(service).toContain('publishedAt: { not: null }')
    expect(service).toContain("marketplaceQuotes: { some: { status: 'SUBMITTED' } }")
    expect(service).toContain("status: { not: 'ARCHIVED' }")
    expect(service).toContain('recipientUserId: userId, readAt: null')
    expect(component).toContain("{ label: 'Nog invullen', value: dashboard.summary.concepts, href: '/opdrachten' as const }")
    expect(component).toContain('href="/adviesdossiers"')
    expect(component).toContain('href="/notificaties"')
  })

  it('verwijst overzichtskaarten naar de centrale pagina Mijn opdrachten', () => {
    const component = read('src/components/marketplace/marketplace-dashboard.tsx')
    const overview = read('src/app/opdrachten/page.tsx')

    expect(component).not.toContain("href: '/hulpvragen' as const")
    expect(overview).toContain('Mijn opdrachten')
    expect(overview).not.toContain('Gepubliceerde opdrachten')
  })
})
