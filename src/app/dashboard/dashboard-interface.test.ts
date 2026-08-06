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
    expect(component).toContain('href="/hulpvragen"')
    expect(component).toContain('href="/adviesdossiers"')
    expect(component).toContain('href="/notificaties"')
  })

  it('onderscheidt het opdrachtenoverzicht van gepubliceerde opdrachten', () => {
    const intakeOverview = read('src/app/hulpvragen/page.tsx')
    const publishedOverview = read('src/app/opdrachten/page.tsx')

    expect(intakeOverview).toContain('Uw opdrachten')
    expect(publishedOverview).toContain('Gepubliceerde opdrachten')
    expect(publishedOverview).toContain("{ value: 'active', label: 'Actief' }")
    expect(publishedOverview).not.toContain('Mijn opdrachten')
  })
})
