import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getAccess: vi.fn(), complete: vi.fn() }))

vi.mock('@/lib/arbo-guides/arbo-guide-access', () => ({ getArboGuideApiAccess: mocks.getAccess }))
vi.mock('@/lib/arbo-guides/arbo-guide-run-service', async () => {
  class ArboGuideRunError extends Error { constructor(public code: string) { super(code) } }
  return { completeArboGuideRun: mocks.complete, ArboGuideRunError }
})

import { POST } from './route'

function request() {
  return new Request('https://preview.example.invalid/wijzers/bhv/runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      answers: { hasEmployees: 'YES' },
      idempotencyKey: 'bhv-browser-run-123',
      startedAt: new Date(Date.now() - 60_000).toISOString(),
      completedAt: new Date().toISOString(),
    }),
  })
}

describe('BHV-runroute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAccess.mockResolvedValue({
      authorized: true,
      userId: '00000000-0000-4000-8000-000000000001',
      organizationId: '00000000-0000-4000-8000-000000000002',
      organizationName: 'Voorbeeld BV',
    })
    mocks.complete.mockResolvedValue({ id: 'run-1', reportNumber: 'BHV-2026-000001', created: true })
  })

  it('bewaart een organisatiegebonden BHV-run', async () => {
    const response = await POST(request())
    expect(response.status).toBe(201)
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: '00000000-0000-4000-8000-000000000002',
      completedByUserId: '00000000-0000-4000-8000-000000000001',
      guideType: 'BHV',
    }))
  })

  it.each([{ status: 401 }, { status: 403 }])('weigert zonder geldige organisatiecontext ($status)', async ({ status }) => {
    mocks.getAccess.mockResolvedValue({ authorized: false, status })
    expect((await POST(request())).status).toBe(status)
    expect(mocks.complete).not.toHaveBeenCalled()
  })
})
