import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ guard: vi.fn(), schedule: vi.fn(), certificate: vi.fn(), retention: vi.fn(), commerce: vi.fn() }))
vi.mock('./academy-commerce-environment', () => ({ assertAcademyCommerceSandbox: mocks.guard }))
vi.mock('./learning-retention-service', () => ({ runLearningRetentionMaintenance: mocks.schedule }))
vi.mock('./learning-certificate-email-worker', () => ({ deliverLearningCertificateEmails: mocks.certificate }))
vi.mock('./learning-retention-email-worker', () => ({ deliverLearningRetentionEmails: mocks.retention }))
vi.mock('./academy-commerce-email-worker', () => ({ deliverAcademyCommerceEmails: mocks.commerce }))
import { runAcademySandboxOperations } from './academy-operations-service'
beforeEach(() => vi.resetAllMocks())
describe('Academy operationele simulatie, geen productiecron of defaultprovider', () => {
  it('weigert buiten de exacte sandbox vóór iedere planning of verzending', async () => {
    mocks.guard.mockImplementation(() => { throw new Error('REFUSED') })
    await expect(runAcademySandboxOperations({ send: vi.fn() })).rejects.toThrow('REFUSED')
    expect(mocks.schedule).not.toHaveBeenCalled(); expect(mocks.certificate).not.toHaveBeenCalled()
  })
  it('hergebruikt de bestaande planning en drie workers met dezelfde expliciete fake', async () => {
    const send = vi.fn(), now = () => new Date('2026-10-26T12:00:00Z')
    const result = await runAcademySandboxOperations({ send, now, limit: 3 })
    expect(mocks.schedule).toHaveBeenCalledWith(now())
    for (const worker of [mocks.certificate, mocks.retention, mocks.commerce]) expect(worker).toHaveBeenCalledWith({ send, now, limit: 3 })
    expect(Object.values(result).every(r => r.status === 'PASS')).toBe(true)
  })
  it('isoleert een workerfout en retourneert geen gevoelige foutdetails', async () => {
    mocks.certificate.mockRejectedValue(new Error('sensitive provider detail'))
    const result = await runAcademySandboxOperations({ send: vi.fn() })
    expect(result.certificateDelivery.status).toBe('FAIL')
    expect(mocks.retention).toHaveBeenCalled(); expect(mocks.commerce).toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toContain('sensitive')
  })
  it('rapporteert een terminale deliveryfailure ook zonder exception als FAIL', async () => {
    mocks.retention.mockResolvedValue({ sent: 0, failed: 1 })
    const result = await runAcademySandboxOperations({ send: vi.fn() })
    expect(result.retentionDelivery.status).toBe('FAIL')
  })
})
