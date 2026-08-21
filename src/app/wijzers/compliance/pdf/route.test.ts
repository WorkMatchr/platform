import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ access: vi.fn(), getRun: vi.fn(), buildPdf: vi.fn() }))
vi.mock('@/lib/arbo-guides/arbo-guide-access', () => ({ getArboGuideApiAccess: mocks.access }))
vi.mock('@/lib/arbo-guides/arbo-guide-run-service', () => {
  class ArboGuideRunError extends Error { constructor(public code: string) { super(code) } }
  return { ArboGuideRunError, getArboGuideRun: mocks.getRun }
})
vi.mock('@/lib/compliance-guide/compliance-report-pdf', () => ({ buildComplianceReportPdf: mocks.buildPdf }))

import { POST } from './route'

const request = (runId = 'run-compliance') => new Request('https://workmatchr.nl/wijzers/compliance/pdf', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId }),
})

describe('beveiligde Compliance-PDF-route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.access.mockResolvedValue({ authorized: true, userId: 'user-1', organizationId: 'organization-1', organizationName: 'Voorbeeld BV' })
    mocks.getRun.mockResolvedValue({ guideType: 'COMPLIANCE', reportNumber: 'CW-2026-000001', reportSnapshot: {} })
    mocks.buildPdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]))
  })

  it('weigert anonieme PDF-download vóór runlookup', async () => {
    mocks.access.mockResolvedValue({ authorized: false, status: 401 })
    expect((await POST(request())).status).toBe(401)
    expect(mocks.getRun).not.toHaveBeenCalled()
  })

  it('genereert uitsluitend de opgeslagen tenantgebonden snapshot', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.getRun).toHaveBeenCalledWith({ userId: 'user-1', organizationId: 'organization-1' }, 'run-compliance')
    expect(response.headers.get('content-disposition')).toContain('CW-2026-000001')
  })

  it('weigert een cross-tenant of verkeerd wijzertype fail-closed', async () => {
    mocks.getRun.mockResolvedValueOnce({ guideType: 'BHV', reportNumber: 'BHV-2026-000001', reportSnapshot: {} })
    expect((await POST(request())).status).toBe(404)
  })
})
