import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const state = vi.hoisted(() => ({
  membership: vi.fn(),
  runs: vi.fn(),
}))

vi.mock('@/lib/organizations/organization-authorization', () => ({
  requireOrganizationMembership: state.membership,
}))
vi.mock('@/lib/arbo-guides/arbo-guide-run-service', () => ({
  listArboGuideRuns: state.runs,
  arboGuideReportSnapshotSchema: { parse: (snapshot: unknown) => snapshot },
}))

import MyArboGuidesPage from './page'

describe('Mijn Arbo-wijzers startactie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.membership.mockResolvedValue({
      user: { id: 'user-a' },
      activeMembership: { organization: { id: 'organization-a' } },
    })
    state.runs.mockResolvedValue([])
  })

  it('biedt een nieuwe wijzer aan bij een leeg overzicht', async () => {
    const html = renderToStaticMarkup(await MyArboGuidesPage())
    expect(html).toContain('Nieuwe Arbo-wijzer')
    expect(html).toContain('href="/wijzers"')
    expect(html).toContain('Er zijn nog geen afgeronde Arbo-wijzers')
    expect(state.runs).toHaveBeenCalledWith({ userId: 'user-a', organizationId: 'organization-a' })
  })

  it('behoudt de startactie naast bestaande rapporten', async () => {
    state.runs.mockResolvedValue([{
      id: 'synthetic-run',
      guideType: 'BHV',
      reportNumber: 'BHV-TEST-1',
      completedAt: new Date('2026-10-01T12:00:00.000Z'),
      guideVersion: 1,
      reportVersion: 1,
      reportSnapshot: {
        schemaVersion: 1,
        summary: { order: 2, action: 1, check: 0, notApplicable: 0 },
      },
    }])

    const html = renderToStaticMarkup(await MyArboGuidesPage())
    expect(html).toContain('Nieuwe Arbo-wijzer')
    expect(html).toContain('href="/wijzers"')
    expect(html).toContain('BHV-TEST-1')
    expect(html).toContain('href="/mijn-arbo-wijzers/synthetic-run"')
    expect(html).toContain('href="/mijn-arbo-wijzers/synthetic-run/pdf"')
  })
})
