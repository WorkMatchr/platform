import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ enabled: false, access: vi.fn(), load: vi.fn(), complete: vi.fn() }))
vi.mock('@/lib/compliance/compliance-f4-framework', () => ({ isF4Enabled: () => mocks.enabled, loadF4Framework: mocks.load }))
vi.mock('@/lib/arbo-guides/arbo-guide-access', () => ({ getArboGuideApiAccess: mocks.access }))
vi.mock('@/lib/arbo-guides/arbo-guide-run-service', () => ({ completeArboGuideRun: mocks.complete, ArboGuideRunError: class extends Error { constructor(public code: string) { super(code) } } }))
import { POST } from './route'
import { ArboGuideRunError } from '@/lib/arbo-guides/arbo-guide-run-service'
import { f4TestDefinition, f4PositiveAnswers } from '@/test-fixtures/compliance-f4'
const request = (body: unknown) => new Request('http://localhost/wijzers/compliance/v2/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const body = () => ({ answers: f4PositiveAnswers, idempotencyKey: 'b0000000-0000-4000-8000-000000000001', startedAt: new Date().toISOString(), completedAt: new Date().toISOString() })
beforeEach(() => { vi.clearAllMocks(); mocks.enabled = true; mocks.access.mockResolvedValue({ authorized: true, organizationId: 'trusted-org', userId: 'trusted-user', organizationName: 'Test' }); mocks.load.mockResolvedValue(f4TestDefinition()); mocks.complete.mockResolvedValue({ id: 'run', created: true }) })
describe('F4 route', () => {
  it('staat standaard uit en raakt dan auth/database niet aan', async () => { mocks.enabled = false; expect((await POST(request(body()))).status).toBe(404); expect(mocks.access).not.toHaveBeenCalled(); expect(mocks.complete).not.toHaveBeenCalled() })
  for (const status of [401,403]) it(`weigert ${status} zonder framework/opslag`, async () => { mocks.access.mockResolvedValue({ authorized: false, status }); expect((await POST(request(body()))).status).toBe(status); expect(mocks.load).not.toHaveBeenCalled() })
  it('negeert geen vervalste tenant/framework/snapshot: weigert de aanvraag', async () => { expect((await POST(request({ ...body(), organizationId: 'foreign' }))).status).toBe(400); expect(mocks.complete).not.toHaveBeenCalled() })
  it('berekent server-side en gebruikt uitsluitend de geautoriseerde context', async () => {
    expect((await POST(request(body()))).status).toBe(201)
    const input = mocks.complete.mock.calls[0][0]
    expect(input.organizationId).toBe('trusted-org'); expect(input.completedByUserId).toBe('trusted-user')
    expect(input.reportSnapshot.results).toHaveLength(10); expect(input.guideVersion).toBe('2')
    expect(mocks.complete.mock.calls[0][1]).toEqual({ maxCompletionAgeMs: 300_000 })
  })
  it('laat oude identieke inzendingen door de geautoriseerde replaycontrole beoordelen', async () => {
    const old = new Date(Date.now() - 360_000).toISOString()
    mocks.complete.mockResolvedValue({ id: 'existing', created: false })
    expect((await POST(request({ ...body(), startedAt: old, completedAt: old }))).status).toBe(200)
    mocks.complete.mockRejectedValue(new ArboGuideRunError('EXPIRED_COMPLETION'))
    const expired = await POST(request({ ...body(), startedAt: old, completedAt: old }))
    expect(expired.status).toBe(409)
    expect(await expired.json()).toEqual({ saved: false, code: 'EXPIRED_COMPLETION' })
  })
  it('weigert verlopen/verkeerde invoer en ontbrekende gepubliceerde bronnen', async () => {
    expect((await POST(request({ ...body(), completedAt: '2020-01-01T00:00:00.000Z' }))).status).toBe(400)
    mocks.load.mockRejectedValue(new Error('Ontbrekende bronbinding'))
    expect((await POST(request(body()))).status).toBe(400); expect(mocks.complete).not.toHaveBeenCalled()
  })
})
