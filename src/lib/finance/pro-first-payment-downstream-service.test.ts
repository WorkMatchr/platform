import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  findSubscription: vi.fn(),
  deliver: vi.fn(),
  recordDeliveryFailure: vi.fn(),
  syncJortt: vi.fn(),
  createJorttGateway: vi.fn(() => ({ submitInvoice: vi.fn() })),
}))

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    professionalSubscription: { findUnique: mocks.findSubscription },
  }),
}))
vi.mock('./financial-invoice-delivery-service', () => ({
  deliverFinancialInvoiceEmail: mocks.deliver,
  recordFinancialInvoiceEmailFailure: mocks.recordDeliveryFailure,
}))
vi.mock('./jortt-api-gateway', () => ({ createJorttGateway: mocks.createJorttGateway }))
vi.mock('./jortt-sync-service', () => ({ syncFinancialInvoiceToJortt: mocks.syncJortt }))

const subscriptionId = '30000000-0000-4000-8000-000000000001'
const purchaseId = '40000000-0000-4000-8000-000000000001'
const invoiceId = '50000000-0000-4000-8000-000000000001'

function activeSubscription() {
  return {
    id: subscriptionId,
    status: 'ACTIVE',
    mollieSubscriptionId: 'sub_live',
    firstPaymentPurchase: {
      id: purchaseId,
      kind: 'PRO_SUBSCRIPTION',
      status: 'PAID',
      createdByUserId: '10000000-0000-4000-8000-000000000001',
      invoice: { id: invoiceId, snapshotVersion: 2 },
    },
    firstPaymentAttempts: [],
  }
}

describe('Pro first-payment downstream-finalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findSubscription.mockResolvedValue(activeSubscription())
    mocks.deliver.mockResolvedValue({ delivered: true, idempotent: false })
    mocks.syncJortt.mockResolvedValue({ status: 'SYNCED', attemptCount: 1 })
  })

  it('rondt ontbrekende mail en Jortt-sync voor dezelfde bestaande factuur af', async () => {
    const { finalizeProFirstPaymentDownstream } = await import('./pro-first-payment-downstream-service')
    const result = await finalizeProFirstPaymentDownstream(subscriptionId)

    expect(mocks.deliver).toHaveBeenCalledWith(invoiceId)
    expect(mocks.syncJortt).toHaveBeenCalledWith(invoiceId, expect.any(Object))
    expect(result).toMatchObject({
      subscriptionId,
      purchaseId,
      invoiceId,
      invoiceEmail: { status: 'COMPLETED' },
      jortt: { status: 'COMPLETED' },
    })
  })

  it('maakt bij replay geen tweede mail of remote factuur via de idempotente services', async () => {
    mocks.deliver.mockResolvedValue({ delivered: true, idempotent: true })
    mocks.syncJortt.mockResolvedValue({ status: 'SYNCED', attemptCount: 1 })
    const { finalizeProFirstPaymentDownstream } = await import('./pro-first-payment-downstream-service')

    await expect(finalizeProFirstPaymentDownstream(subscriptionId)).resolves.toMatchObject({
      invoiceEmail: { status: 'ALREADY_COMPLETED' },
      jortt: { status: 'COMPLETED' },
    })
  })

  it('is een veilige no-op wanneer beide bestaande services al afgerond zijn', async () => {
    mocks.deliver.mockResolvedValue({ delivered: true, idempotent: true })
    mocks.syncJortt.mockResolvedValue({ status: 'SYNCED', attemptCount: 2 })
    const { finalizeProFirstPaymentDownstream } = await import('./pro-first-payment-downstream-service')

    const result = await finalizeProFirstPaymentDownstream(subscriptionId)

    expect(result.invoiceEmail.status).toBe('ALREADY_COMPLETED')
    expect(result.jortt.status).toBe('COMPLETED')
  })

  it('laat een mailfout de onafhankelijke Jortt-stap niet blokkeren', async () => {
    mocks.deliver.mockRejectedValue(new Error('EMAIL_DELIVERY_NOT_CONFIGURED'))
    const { finalizeProFirstPaymentDownstream } = await import('./pro-first-payment-downstream-service')

    const result = await finalizeProFirstPaymentDownstream(subscriptionId)

    expect(mocks.recordDeliveryFailure).toHaveBeenCalledWith(
      invoiceId,
      purchaseId,
      '10000000-0000-4000-8000-000000000001',
    )
    expect(mocks.syncJortt).toHaveBeenCalledTimes(1)
    expect(result.invoiceEmail).toEqual({ status: 'FAILED', errorCode: 'EMAIL_DELIVERY_NOT_CONFIGURED' })
    expect(result.jortt.status).toBe('COMPLETED')
  })

  it('laat een Jortt-fout de reeds afgeronde mail intact', async () => {
    mocks.syncJortt.mockRejectedValue(new Error('JORTT_TEMPORARY_PROVIDER_ERROR'))
    const { finalizeProFirstPaymentDownstream } = await import('./pro-first-payment-downstream-service')

    const result = await finalizeProFirstPaymentDownstream(subscriptionId)

    expect(result.invoiceEmail.status).toBe('COMPLETED')
    expect(result.jortt).toEqual({ status: 'FAILED', errorCode: 'JORTT_TEMPORARY_PROVIDER_ERROR' })
  })

  it('vertrouwt bij gelijktijdige aanroepen op de bestaande downstream-locks en idempotency', async () => {
    mocks.deliver
      .mockResolvedValueOnce({ delivered: true, idempotent: false })
      .mockResolvedValueOnce({ delivered: true, idempotent: true })
    mocks.syncJortt.mockResolvedValue({ status: 'SYNCED', attemptCount: 1 })
    const { finalizeProFirstPaymentDownstream } = await import('./pro-first-payment-downstream-service')

    const results = await Promise.all([
      finalizeProFirstPaymentDownstream(subscriptionId),
      finalizeProFirstPaymentDownstream(subscriptionId),
    ])

    expect(results.map((result) => result.invoiceEmail.status).sort()).toEqual(['ALREADY_COMPLETED', 'COMPLETED'])
    expect(results.every((result) => result.invoiceId === invoiceId)).toBe(true)
  })

  it('faalt gesloten zonder exact één betaalde Snapshot-v2-first-paymentfactuur', async () => {
    mocks.findSubscription.mockResolvedValue({
      ...activeSubscription(),
      firstPaymentAttempts: [{
        purchase: {
          ...activeSubscription().firstPaymentPurchase,
          id: '40000000-0000-4000-8000-000000000002',
          invoice: { id: '50000000-0000-4000-8000-000000000002', snapshotVersion: 2 },
        },
      }],
    })
    const { finalizeProFirstPaymentDownstream } = await import('./pro-first-payment-downstream-service')

    await expect(finalizeProFirstPaymentDownstream(subscriptionId))
      .rejects.toThrow('PRO_DOWNSTREAM_PAID_INVOICE_AMBIGUOUS')
    expect(mocks.deliver).not.toHaveBeenCalled()
    expect(mocks.syncJortt).not.toHaveBeenCalled()
  })
})
