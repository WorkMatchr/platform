import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const m = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), update: vi.fn(), event: vi.fn(), lock: vi.fn() }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ getPlatformAdministratorContext: m.auth }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: async (fn: (tx: unknown) => unknown) => fn({
  $queryRaw: m.lock, financialInvoice: { findUnique: m.find }, financialJorttSync: { update: m.update }, financialEvent: { create: m.event },
}) }) }))
import { retireLegacyJorttTestSync } from './jortt-retirement-service'
import { isRetiredLegacyJorttSync, legacyJorttTestInvoices, operationalJorttFilter } from './jortt-retirement-policy'

describe('begrensde legacy retirement zonder provider', () => {
  beforeEach(() => vi.resetAllMocks())
  it.each(Object.entries(legacyJorttTestInvoices))('retireert uitsluitend %s met append-only actor/audit en behoud van historie', async (id, number) => {
    const sync = { id: 'sync', invoiceId: id, status: 'RETRY_REQUIRED', lastErrorCode: 'JORTT_PROVIDER_REJECTED', attemptCount: 2 }
    const source = { id, invoiceNumber: number, snapshotVersion: 1, documentType: 'INVOICE', jorttSync: sync }
    m.find.mockResolvedValue(source)
    await retireLegacyJorttTestSync(id, 'actor')
    expect(m.auth).toHaveBeenCalledWith('actor')
    expect(m.lock).toHaveBeenCalledOnce()
    expect(m.update).toHaveBeenCalledWith({ where: { id: 'sync' }, data: { status: 'FAILED', lastErrorCode: 'LEGACY_TEST_DATA', nextAttemptAt: null } })
    expect(m.event).toHaveBeenCalledWith({ data: expect.objectContaining({ actorUserId: 'actor', invoiceId: id, reason: 'LEGACY_TEST_DATA', eventType: 'JORTT_SYNC_RETIRED', metadata: { previousStatus: 'RETRY_REQUIRED', previousErrorCode: 'JORTT_PROVIDER_REJECTED', attemptCount: 2 } }) })
    expect(source.jorttSync).toEqual(sync)
    m.find.mockResolvedValue({ ...source, jorttSync: { ...sync, status: 'FAILED', lastErrorCode: 'LEGACY_TEST_DATA' } })
    await retireLegacyJorttTestSync(id, 'actor')
    expect(m.update).toHaveBeenCalledOnce()
    expect(m.event).toHaveBeenCalledOnce()
  })
  it('weigert ieder ander invoice-ID vóór databasegebruik', async () => {
    await expect(retireLegacyJorttTestSync('other', 'actor')).rejects.toThrow('NOT_ALLOWED')
    expect(m.find).not.toHaveBeenCalled()
  })
  it('weigert onbevoegde actor', async () => {
    m.auth.mockRejectedValue(new Error('FORBIDDEN'))
    await expect(retireLegacyJorttTestSync(Object.keys(legacyJorttTestInvoices)[0], 'actor')).rejects.toThrow('FORBIDDEN')
    expect(m.find).not.toHaveBeenCalled()
  })
  it.each(['PROCESSING', 'SYNCED', 'PENDING'])('weigert status %s zonder writes', async (status) => {
    const [id, number] = Object.entries(legacyJorttTestInvoices)[0]
    m.find.mockResolvedValue({ id, invoiceNumber: number, snapshotVersion: 1, documentType: 'INVOICE', jorttSync: { status } })
    await expect(retireLegacyJorttTestSync(id, 'actor')).rejects.toThrow('STATE_MISMATCH')
    expect(m.update).not.toHaveBeenCalled()
    expect(m.event).not.toHaveBeenCalled()
  })
  it('sluit geen andere v1 of gelijk genummerde factuur uit', () => {
    expect(isRetiredLegacyJorttSync({ invoiceId: 'other', status: 'FAILED', lastErrorCode: 'LEGACY_TEST_DATA' })).toBe(false)
    expect(isRetiredLegacyJorttSync({ invoiceId: Object.keys(legacyJorttTestInvoices)[0], status: 'RETRY_REQUIRED', lastErrorCode: 'JORTT_PROVIDER_REJECTED' })).toBe(false)
    expect(operationalJorttFilter.OR).toContainEqual({ lastErrorCode: null })
  })
})
