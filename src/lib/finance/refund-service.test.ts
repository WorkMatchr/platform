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
  kind: 'CREDIT_PACKAGE',
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
  status: 'PENDING',
  mollieRefundId: null,
  approvedByUserId: '50000000-0000-4000-8000-000000000001',
  purchase,
}

const transaction = {
  $queryRaw: vi.fn(),
  financialRefund: {
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    findUniqueOrThrow: vi.fn(async () => ({ ...refund, creditNote: null })),
    create: vi.fn(async () => refund),
    update: vi.fn(async ({ data }: { data: object }) => ({ ...refund, ...data })),
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
  getPrisma: () => ({ $transaction: mocks.fallbackTransaction, financialInvoice: { findUnique: vi.fn().mockResolvedValue({ id: 'credit-note' }) } }),
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
    transaction.financialRefund.findUnique.mockResolvedValue(null)
    transaction.financialRefund.findFirst.mockResolvedValue(null)
    transaction.financialPurchase.findUnique.mockResolvedValue(purchase)
    transaction.creditTransaction.findFirst.mockResolvedValue(null)
    transaction.financialRefund.findUniqueOrThrow.mockResolvedValue({ ...refund, creditNote: null })
    transaction.financialRefund.create.mockResolvedValue(refund)
    transaction.financialRefund.update.mockImplementation(async ({ data }: { data: object }) => ({ ...refund, ...data }))
    mocks.issueCreditNote.mockResolvedValue({ id: 'credit-note' })
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

  it('verwerkt een volledige betaalde creditaankoop en legt de aanvraag auditbaar vast', async () => {
    const createRefund = vi.fn().mockResolvedValue({ id: 're_test', status: 'refunded' })
    const gateway = { createRefund } as never
    const { refundWorkmatchrError } = await import('./refund-service')
    const result = await refundWorkmatchrError(input, gateway)

    expect(createRefund).toHaveBeenCalledOnce()
    expect(transaction.financialEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ eventType: 'WORKMATCHR_REFUND_REQUESTED', purchaseId: purchase.id }),
    }))
    expect(mocks.phase).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ phase: 'RESERVE' }))
    expect(mocks.phase).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ phase: 'COMPLETE' }))
    expect(mocks.issueCreditNote).toHaveBeenCalledOnce()
    expect(result.refund.status).toBe('REFUNDED')
  })

  it('maakt bij later creditgebruik alleen een reviewrecord en roept Mollie niet aan', async () => {
    transaction.creditTransaction.findFirst.mockResolvedValue({ id: 'later-usage' } as never)
    const createRefund = vi.fn()
    const gateway = { createRefund } as never
    const { refundWorkmatchrError } = await import('./refund-service')
    const result = await refundWorkmatchrError(input, gateway)

    expect(result.reviewRequired).toBe(true)
    expect(createRefund).not.toHaveBeenCalled()
    expect(transaction.financialPurchase.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'REFUND_REVIEW_REQUIRED' } }))
    expect(transaction.financialEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ eventType: 'WORKMATCHR_REFUND_REVIEW_REQUIRED' }),
    }))
  })

  it('weigert een niet-betaalde of niet-creditaankoop vóór Mollie', async () => {
    transaction.financialPurchase.findUnique.mockResolvedValue({ ...purchase, kind: 'PRO_SUBSCRIPTION' })
    const createRefund = vi.fn()
    const gateway = { createRefund } as never
    const { refundWorkmatchrError } = await import('./refund-service')

    await expect(refundWorkmatchrError(input, gateway)).rejects.toThrow('PAID_CREDIT_PURCHASE_REQUIRED')
    expect(createRefund).not.toHaveBeenCalled()
    expect(mocks.phase).not.toHaveBeenCalled()
  })

  it('weigert een onbevoegde actor vóór financiële mutaties', async () => {
    mocks.authorize.mockRejectedValueOnce(new Error('UNAUTHORIZED'))
    const createRefund = vi.fn()
    const gateway = { createRefund } as never
    const { refundWorkmatchrError } = await import('./refund-service')

    await expect(refundWorkmatchrError(input, gateway)).rejects.toThrow('UNAUTHORIZED')
    expect(transaction.financialRefund.create).not.toHaveBeenCalled()
    expect(createRefund).not.toHaveBeenCalled()
  })

  it('hergebruikt een bestaande refund voor dezelfde aankoop, ook met een andere formulierkey', async () => {
    transaction.financialRefund.findFirst.mockResolvedValue({ ...refund, status: 'REFUNDED', purchase: { ...purchase, status: 'REFUNDED' }, creditNote: { id: 'credit-note' } } as never)
    const createRefund = vi.fn()
    const gateway = { createRefund } as never
    const { refundWorkmatchrError } = await import('./refund-service')

    const result = await refundWorkmatchrError({ ...input, idempotencyKey: 'refund:test:second-tab' }, gateway)
    expect(result.refund.id).toBe(refund.id)
    expect(transaction.financialRefund.create).not.toHaveBeenCalled()
    expect(createRefund).not.toHaveBeenCalled()
  })
})
