import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const runUpdate = vi.fn()
const transaction = {
  financialMaintenanceRun: {
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: 'maintenance-run-id' }),
  },
}
const prisma = {
  $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  financialMaintenanceRun: { update: runUpdate },
}
const refunds = vi.fn()
const cancellations = vi.fn()
const suspensions = vi.fn()
const jortt = vi.fn()

vi.mock('@/lib/prisma', () => ({ getPrisma: () => prisma }))
vi.mock('./refund-service', () => ({ reconcilePendingMollieRefunds: refunds }))
vi.mock('./subscription-service', () => ({
  finalizeScheduledProCancellations: cancellations,
  suspendOverdueProSubscriptions: suspensions,
}))
vi.mock('./jortt-api-gateway', () => ({
  createJorttGateway: vi.fn(() => ({})),
  isJorttSyncConfigured: vi.fn(() => true),
}))
vi.mock('./jortt-sync-service', () => ({ retryDueJorttSyncs: jortt }))
vi.mock('./mollie-gateway', () => ({ createMollieGateway: vi.fn(() => ({})) }))

describe('financiële maintenance-orchestratie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    transaction.financialMaintenanceRun.create.mockResolvedValue({ id: 'maintenance-run-id' })
    refunds.mockResolvedValue({ inspected: 2, pending: 1, refunded: 1, failed: 0, canceled: 0, providerErrors: 0 })
    cancellations.mockResolvedValue({ count: 1 })
    suspensions.mockResolvedValue({ count: 1 })
    jortt.mockResolvedValue([{ invoiceId: 'invoice-id', status: 'SYNCED' }])
  })

  it('registreert één succesvolle, idempotent herhaalbare run met categorietotalen', async () => {
    const { runFinancialMaintenance } = await import('./financial-maintenance-service')
    const result = await runFinancialMaintenance(new Date('2026-09-03T10:00:00Z'), {} as never, 'SCHEDULER')

    expect(result.status).toBe('SUCCEEDED')
    expect(transaction.financialMaintenanceRun.deleteMany).toHaveBeenCalledOnce()
    expect(runUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'maintenance-run-id' },
      data: expect.objectContaining({ status: 'SUCCEEDED', errorCodes: [] }),
    }))
    expect(refunds).toHaveBeenCalledOnce()
    expect(cancellations).toHaveBeenCalledOnce()
    expect(suspensions).toHaveBeenCalledOnce()
    expect(jortt).toHaveBeenCalledOnce()
  })

  it('laat een categoriefout de overige categorieën niet blokkeren en bewaart alleen een veilige foutcode', async () => {
    refunds.mockRejectedValue(new Error('MOLLIE_PROVIDER_UNAVAILABLE'))
    cancellations.mockRejectedValue(new Error('gevoelige providertekst met spaties'))
    const { runFinancialMaintenance } = await import('./financial-maintenance-service')
    const result = await runFinancialMaintenance(new Date('2026-09-03T11:00:00Z'), {} as never)

    expect(result.status).toBe('PARTIAL_FAILURE')
    expect(result.errorCodes).toEqual(['MOLLIE_PROVIDER_UNAVAILABLE', 'FINANCIAL_MAINTENANCE_ERROR'])
    expect(suspensions).toHaveBeenCalledOnce()
    expect(jortt).toHaveBeenCalledOnce()
    expect(JSON.stringify(result)).not.toContain('gevoelige providertekst')
  })

  it('slaat een overlappende run over zonder financiële categorie te starten', async () => {
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2002' })
    const { runFinancialMaintenance } = await import('./financial-maintenance-service')
    const result = await runFinancialMaintenance(new Date('2026-09-03T12:00:00Z'), {} as never)

    expect(result.status).toBe('SKIPPED_CONCURRENT')
    expect(refunds).not.toHaveBeenCalled()
    expect(cancellations).not.toHaveBeenCalled()
    expect(suspensions).not.toHaveBeenCalled()
    expect(jortt).not.toHaveBeenCalled()
  })
})
