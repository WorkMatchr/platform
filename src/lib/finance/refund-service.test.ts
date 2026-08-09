import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  phase: vi.fn(),
  issueCreditNote: vi.fn(),
  fallbackTransaction: vi.fn(),
}))

const purchase = {
  id: '10000000-0000-4000-8000-000000000001',
  organizationId: '20000000-0000-4000-8000-000000000001',
  status: 'PAID',
  molliePaymentId: 'tr_test',
  credits: 25,
  amountInclVatCents: 3_025,
  creditedTransaction: { creditAccountId: '30000000-0000-4000-8000-000000000001', createdAt: new Date('2026-08-09T10:00:00Z') },
}

const refund = {
  id: '40000000-0000-4000-8000-000000000001',
  purchaseId: purchase.id,
  amountCents: purchase.amountInclVatCents,
  credits: purchase.credits,
  purchase,
}

const transaction = {
  $queryRaw: vi.fn(),
  financialRefund: {
    findUnique: vi.fn(async () => null),
    create: vi.fn(async () => refund),
    update: vi.fn(),
  },
  financialPurchase: {
    findUnique: vi.fn(async () => purchase),
    update: vi.fn(),
  },
  financialEvent: { upsert: vi.fn() },
  creditTransaction: { findFirst: vi.fn(async () => null) },
}

let serializableCall = 0
let failCompletion = false

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ $transaction: mocks.fallbackTransaction }),
}))
vi.mock('@/lib/credits/credit-wallet-service', () => ({
  recordFinancialRefundCreditPhaseInTransaction: mocks.phase,
}))
vi.mock('@/lib/marketplace/marketplace-authorization', () => ({
  requireMarketplacePlatformAdmin: mocks.authorize,
}))
vi.mock('./invoice-service', () => ({
  issueCreditNoteForCompletedRefund: mocks.issueCreditNote,
}))
vi.mock('./financial-transaction', () => ({
  runSerializableFinancialTransaction: async (operation: (value: typeof transaction) => unknown) => {
    serializableCall += 1
    if (serializableCall === 2 && failCompletion) throw new Error('DATABASE_COMPLETION_FAILED')
    return operation(transaction)
  },
}))

const input = {
  actorUserId: '50000000-0000-4000-8000-000000000001',
  purchaseId: purchase.id,
  reasonCode: 'WORKMATCHR_TECHNICAL_ERROR',
  reason: 'Fictieve technische fout voor een regressietest.',
  idempotencyKey: 'refund:test:technical-error',
}

describe('financiële refund-foutisolatie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serializableCall = 0
    failCompletion = false
    mocks.authorize.mockResolvedValue({ id: input.actorUserId })
    mocks.phase.mockImplementation(async (_transaction, values: { phase: string }) => ({ id: `ledger-${values.phase}` }))
    mocks.fallbackTransaction.mockImplementation((operation: (value: typeof transaction) => unknown) => operation(transaction))
  })

  it('houdt credits gereserveerd wanneer Mollie accepteert maar lokale afronding faalt', async () => {
    failCompletion = true
    const gateway = { createRefund: vi.fn().mockResolvedValue({ id: 're_test', status: 'pending' }) } as never
    const { refundWorkmatchrError } = await import('./refund-service')

    await expect(refundWorkmatchrError(input, gateway)).rejects.toThrow('DATABASE_COMPLETION_FAILED')
    expect(mocks.phase).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ phase: 'RESERVE' }))
    expect(mocks.phase).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ phase: 'RELEASE' }))
    expect(mocks.fallbackTransaction).not.toHaveBeenCalled()
  })

  it('geeft de reservering alleen vrij wanneer Mollie de refund niet accepteert', async () => {
    const gateway = { createRefund: vi.fn().mockRejectedValue(new Error('MOLLIE_REFUND_FAILED')) } as never
    const { refundWorkmatchrError } = await import('./refund-service')

    await expect(refundWorkmatchrError(input, gateway)).rejects.toThrow('MOLLIE_REFUND_FAILED')
    expect(mocks.phase).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ phase: 'RELEASE' }))
    expect(transaction.financialRefund.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'FAILED' } }))
  })
})
