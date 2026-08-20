import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string) { return readFileSync(join(process.cwd(), path), 'utf8') }

describe('Mijn Arbo-wijzers', () => {
  it('autoriseert overzicht, detail en PDF server-side op de actieve organisatie', () => {
    expect(source('src/app/mijn-arbo-wijzers/page.tsx')).toContain('requireOrganizationMembership')
    expect(source('src/app/mijn-arbo-wijzers/[runId]/page.tsx')).toContain('organizationId: activeMembership.organization.id')
    expect(source('src/app/mijn-arbo-wijzers/[runId]/pdf/route.ts')).toContain('organizationId: context.activeMembership.organization.id')
    expect(source('src/lib/arbo-guides/arbo-guide-run-service.ts')).toContain('run.organizationId !== viewer.organizationId')
  })

  it('slaat de Compliance-uitkomst op zonder antwoorden in URL of PDF-queryparameters', () => {
    const guide = source('src/components/public/compliance-guide.tsx')
    expect(guide).toContain("fetch('/wijzers/compliance/runs'")
    expect(guide).toContain('idempotencyKey')
    expect(guide).not.toMatch(/URLSearchParams.*answers|\?answers=/)
    expect(guide.indexOf('Bewaar uw resultaat')).toBeLessThan(guide.indexOf('Wilt u uw situatie laten beoordelen?'))
    expect(guide.indexOf('Wilt u uw situatie laten beoordelen?')).toBeLessThan(guide.indexOf('<ConsultedSources'))
  })
})
