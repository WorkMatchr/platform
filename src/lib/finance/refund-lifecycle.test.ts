import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({ phase: vi.fn(), issueCreditNote: vi.fn(), failNextTransaction: false }))

let current: Record<string, unknown>
const transaction = {
  $queryRaw: vi.fn(),
  financialRefund: {
    findUniqueOrThrow: vi.fn(async () => ({ ...current })),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      current = { ...current, ...data }
      return { ...current }
    }),
  },
  financialPurchase: { update: vi.fn() },
  financialEvent: { upsert: vi.fn() },
}

vi.mock('./financial-transaction', () => ({
  runSerializableFinancialTransaction: (operation: (value: typeof transaction) => unknown) => {
    if (mocks.failNextTransaction) {
      mocks.failNextTransaction = false
      throw new Error('LOCAL_TRANSACTION_FAILED')
    }
    return operation(transaction)
  },
}))
vi.mock('@/lib/credits/credit-wallet-service', () => ({ recordFinancialRefundCreditPhaseInTransaction: mocks.phase }))
vi.mock('./invoice-service', () => ({ issueCreditNoteForCompletedRefund: mocks.issueCreditNote }))
vi.mock('@/lib/prisma', () => ({ getPrisma: vi.fn() }))
vi.mock('@/lib/marketplace/marketplace-authorization', () => ({ requireMarketplacePlatformAdmin: vi.fn() }))

const refundId = '40000000-0000-4000-8000-000000000001'

function resetRefund() {
  current = {
    id: refundId,
    purchaseId: '10000000-0000-4000-8000-000000000001',
    approvedByUserId: '50000000-0000-4000-8000-000000000001',
    status: 'PENDING',
    mollieRefundId: null,
    credits: 25,
    creditNote: null,
    purchase: { organizationId: '20000000-0000-4000-8000-000000000001' },
  }
}

describe('Mollie-refundlevenscyclus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.failNextTransaction = false
    resetRefund()
    mocks.phase.mockImplementation(async (_transaction, values: { phase: string }) => ({ id: `ledger-${values.phase}` }))
    mocks.issueCreditNote.mockImplementation(async () => {
      const creditNote = { id: '60000000-0000-4000-8000-000000000001' }
      current = { ...current, creditNote }
      return creditNote
    })
  })

  it.each(['queued', 'pending', 'processing'] as const)('houdt status %s hangend zonder afschrijving of creditnota', async (status) => {
    const { applyMollieRefundSnapshot } = await import('./refund-service')
    const result = await applyMollieRefundSnapshot(refundId, { id: 're_test', status })

    expect(result.refund).toMatchObject({ status: 'PENDING', mollieRefundId: 're_test' })
    expect(mocks.phase).not.toHaveBeenCalled()
    expect(mocks.issueCreditNote).not.toHaveBeenCalled()
    expect(transaction.financialPurchase.update).not.toHaveBeenCalled()
  })

  it('boekt credits en creditnota uitsluitend na de definitieve status refunded', async () => {
    const { applyMollieRefundSnapshot } = await import('./refund-service')
    const result = await applyMollieRefundSnapshot(refundId, { id: 're_test', status: 'refunded' })

    expect(result.refund).toMatchObject({ status: 'REFUNDED', ledgerTransactionId: 'ledger-COMPLETE' })
    expect(mocks.phase).toHaveBeenCalledOnce()
    expect(mocks.phase).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ phase: 'COMPLETE' }))
    expect(mocks.issueCreditNote).toHaveBeenCalledOnce()
    expect(transaction.financialPurchase.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REFUNDED' }) }))
  })

  it.each(['failed', 'canceled'] as const)('geeft de reservering vrij na definitieve status %s', async (status) => {
    const { applyMollieRefundSnapshot } = await import('./refund-service')
    const result = await applyMollieRefundSnapshot(refundId, { id: 're_test', status })

    expect(result.refund.status).toBe(status.toUpperCase())
    expect(mocks.phase).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ phase: 'RELEASE' }))
    expect(mocks.issueCreditNote).not.toHaveBeenCalled()
  })

  it('verwerkt een dubbel provider-successsignaal idempotent', async () => {
    const { applyMollieRefundSnapshot } = await import('./refund-service')
    await applyMollieRefundSnapshot(refundId, { id: 're_test', status: 'refunded' })
    await applyMollieRefundSnapshot(refundId, { id: 're_test', status: 'refunded' })

    expect(mocks.phase).toHaveBeenCalledOnce()
    expect(mocks.issueCreditNote).toHaveBeenCalledOnce()
  })

  it('kan na een lokale transactionele fout met dezelfde providersnapshot veilig worden hervat', async () => {
    const { applyMollieRefundSnapshot } = await import('./refund-service')
    mocks.failNextTransaction = true
    await expect(applyMollieRefundSnapshot(refundId, { id: 're_test', status: 'refunded' })).rejects.toThrow('LOCAL_TRANSACTION_FAILED')
    const result = await applyMollieRefundSnapshot(refundId, { id: 're_test', status: 'refunded' })

    expect(result.refund.status).toBe('REFUNDED')
    expect(mocks.phase).toHaveBeenCalledOnce()
    expect(mocks.issueCreditNote).toHaveBeenCalledOnce()
  })
})
