import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  eventFind: vi.fn(),
  eventCreate: vi.fn(),
  eventUpsert: vi.fn(),
  invoiceFind: vi.fn(),
  queryRaw: vi.fn(),
}))

const transaction = {
  $queryRaw: mocks.queryRaw,
  financialEvent: { findUnique: mocks.eventFind, create: mocks.eventCreate },
  financialInvoice: { findUnique: mocks.invoiceFind },
}

vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ financialEvent: { upsert: mocks.eventUpsert } }) }))
vi.mock('./financial-transaction', () => ({ runSerializableFinancialTransaction: (operation: (tx: typeof transaction) => unknown) => operation(transaction) }))

const invoice = {
  id: '60000000-0000-4000-8000-000000000001',
  invoiceNumber: 'WM-26085001',
  purchaseId: '50000000-0000-4000-8000-000000000001',
  purchase: {
    status: 'PAID',
    createdByUserId: '40000000-0000-4000-8000-000000000001',
    createdByUser: { email: 'finance@example.invalid', displayName: 'Factuurgebruiker' },
  },
}

describe('factuurmailbezorging', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://platform-finance-preview-workmatchrs-projects.vercel.app')
    vi.clearAllMocks()
    mocks.eventFind.mockResolvedValue(null)
    mocks.invoiceFind.mockResolvedValue(invoice)
    mocks.eventCreate.mockResolvedValue({ id: 'event-id' })
    mocks.eventUpsert.mockResolvedValue({ id: 'failure-event' })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('verstuurt één beveiligde factuurlink na een betaalde aankoop en schrijft audit', async () => {
    const sender = vi.fn().mockResolvedValue({ accepted: true, transport: 'RESEND', status: 'ACCEPTED', messageId: 'message-id' })
    const { deliverFinancialInvoiceEmail } = await import('./financial-invoice-delivery-service')
    await expect(deliverFinancialInvoiceEmail(invoice.id, sender)).resolves.toEqual({ delivered: true, idempotent: false })
    expect(sender).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'FINANCIAL_INVOICE',
      to: 'finance@example.invalid',
      idempotencyKey: `invoice-email:${invoice.id}`,
      html: expect.stringContaining(`https://platform-finance-preview-workmatchrs-projects.vercel.app/credits/facturen/${invoice.id}/pdf`),
    }))
    expect(mocks.eventCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'INVOICE_EMAIL_SENT', invoiceId: invoice.id }) }))
  })

  it('herhaalt een al bezorgde factuurmail niet', async () => {
    mocks.eventFind.mockResolvedValue({ id: 'existing-event' })
    const sender = vi.fn()
    const { deliverFinancialInvoiceEmail } = await import('./financial-invoice-delivery-service')
    await expect(deliverFinancialInvoiceEmail(invoice.id, sender)).resolves.toEqual({ delivered: true, idempotent: true })
    expect(sender).not.toHaveBeenCalled()
  })

  it('weigert een factuur zonder betaalde aankoop en registreert alleen veilige faalaudit', async () => {
    mocks.invoiceFind.mockResolvedValue({ ...invoice, purchase: { ...invoice.purchase, status: 'EXPIRED' } })
    const sender = vi.fn()
    const { deliverFinancialInvoiceEmail, recordFinancialInvoiceEmailFailure } = await import('./financial-invoice-delivery-service')
    await expect(deliverFinancialInvoiceEmail(invoice.id, sender)).rejects.toThrow('PAID_PURCHASE_INVOICE_REQUIRED')
    expect(sender).not.toHaveBeenCalled()
    await recordFinancialInvoiceEmailFailure(invoice.id, invoice.purchaseId, invoice.purchase.createdByUserId)
    expect(mocks.eventUpsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ eventType: 'INVOICE_EMAIL_FAILED', metadata: { retryable: true } }) }))
  })
})
