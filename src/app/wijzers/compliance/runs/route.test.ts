import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  complete: vi.fn(),
}))

vi.mock('@/lib/organizations/organization-authorization', () => ({ getOptionalActiveOrganizationContext: mocks.getContext }))
vi.mock('@/lib/arbo-guides/arbo-guide-run-service', async () => {
  class ArboGuideRunError extends Error { constructor(public code: string) { super(code) } }
  return { completeArboGuideRun: mocks.complete, ArboGuideRunError }
})

import { POST } from './route'

function request(body: unknown) {
  return new Request('https://preview.example.invalid/wijzers/compliance/runs', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('Compliance-runroute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getContext.mockResolvedValue({
      user: { id: '00000000-0000-4000-8000-000000000001' },
      activeMembership: { organization: { id: '00000000-0000-4000-8000-000000000002', name: 'Voorbeeld BV' } },
    })
    mocks.complete.mockResolvedValue({ id: 'run-1', reportNumber: 'CW-2026-000001', created: true })
  })

  it('normaliseert en bewaart één historische run voor de server-side organisatie', async () => {
    const response = await POST(request({
      answers: { hasEmployees: 'YES', employeeCount: 'ONE_TO_25', generalPolicy: 'YES', forged: 'NO' },
      idempotencyKey: 'browser-run-123', startedAt: new Date(Date.now() - 60_000).toISOString(), completedAt: new Date().toISOString(),
    }))
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ saved: true, runId: 'run-1', reportNumber: 'CW-2026-000001' })
    expect(mocks.complete).toHaveBeenCalledOnce()
    expect(mocks.complete.mock.calls[0][0]).toMatchObject({
      organizationId: '00000000-0000-4000-8000-000000000002',
      completedByUserId: '00000000-0000-4000-8000-000000000001',
      guideType: 'COMPLIANCE', guideVersion: '1', reportVersion: '1.0',
    })
    expect(mocks.complete.mock.calls[0][0].answersSnapshot).not.toHaveProperty('forged')
  })

  it('maakt voor een anonieme gebruiker geen run', async () => {
    mocks.getContext.mockResolvedValue(null)
    const response = await POST(request({ idempotencyKey: 'browser-run-123', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), answers: {} }))
    expect(response.status).toBe(401)
    expect(mocks.complete).not.toHaveBeenCalled()
  })

  it('weigert gemanipuleerde afrondingsmomenten', async () => {
    const response = await POST(request({ idempotencyKey: 'browser-run-123', startedAt: '2026-01-01T00:00:00Z', completedAt: '2027-01-01T00:00:00Z', answers: {} }))
    expect(response.status).toBe(400)
    expect(mocks.complete).not.toHaveBeenCalled()
  })
})
