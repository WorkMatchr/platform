import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(), invoiceFind: vi.fn(), syncUpdate: vi.fn(), attemptCreate: vi.fn(), eventCreate: vi.fn(), eventUpsert: vi.fn(), syncFindMany: vi.fn(),
}))

const prisma = {
  $transaction: vi.fn(async (callback: (transaction: unknown) => unknown) => callback({
    $queryRaw: mocks.queryRaw,
    financialInvoice: { findUnique: mocks.invoiceFind },
    financialJorttSync: { update: mocks.syncUpdate },
    financialJorttSyncAttempt: { create: mocks.attemptCreate },
    financialEvent: { create: mocks.eventCreate, upsert: mocks.eventUpsert },
  })),
  financialJorttSync: { findMany: mocks.syncFindMany },
}

vi.mock('@/lib/prisma', () => ({ getPrisma: () => prisma }))

import { retryDueJorttSyncs, syncFinancialInvoiceToJortt, type JorttGateway } from './jortt-sync-service'

function invoice(status = 'PENDING', updatedAt = new Date('2026-08-25T10:00:00Z')) {
  return {
    id: 'invoice-id', organizationId: 'organization-id', invoiceNumber: 'WM-2026-000001', documentType: 'INVOICE', pricingMode: 'STANDARD', issuedAt: new Date('2026-08-25T10:00:00Z'), supplyDate: new Date('2026-08-25T10:00:00Z'), servicePeriodStart: null, servicePeriodEnd: null,
    sellerLegalName: 'WorkMatchr', sellerKvKNumber: '12345678', sellerVatId: 'NL123456789B01', customerOrganizationName: 'Test B.V.', customerAddressLine: 'Teststraat 1', customerPostalCode: '1234 AB', customerCity: 'Utrecht', customerCountryCode: 'NL', customerKvKNumber: null, customerVatId: null,
    amountExclVatCents: 10_000, vatRateBps: 2_100, vatAmountCents: 2_100, amountInclVatCents: 12_100, currency: 'EUR', molliePaymentId: 'tr_test', originalInvoice: null,
    lines: [{ description: 'Credits', quantity: 100, unit: 'credit', unitPriceExclVatCents: 100, discountAmountCents: 0, netAmountExclVatCents: 10_000, vatRateBps: 2_100, vatAmountCents: 2_100 }],
    jorttSync: { id: 'sync-id', status, attemptCount: 0, updatedAt, externalReference: null, remoteInvoiceNumber: null, technicalReference: null },
  }
}

describe('Jortt synchronisatieservice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-25T12:00:00Z'))
    mocks.invoiceFind.mockResolvedValue(invoice())
    mocks.syncUpdate.mockImplementation(async ({ data }: { data: { status: string; attemptCount?: unknown } }) => data.status === 'PROCESSING'
      ? { ...invoice().jorttSync, status: 'PROCESSING', attemptCount: 1 }
      : { ...invoice().jorttSync, ...data })
    mocks.attemptCreate.mockResolvedValue({})
    mocks.eventCreate.mockResolvedValue({})
    mocks.eventUpsert.mockResolvedValue({})
    mocks.syncFindMany.mockResolvedValue([])
  })

  it('slaat remote ID en Jortt-nummer op zonder de WorkMatchr-factuur te wijzigen', async () => {
    const gateway: JorttGateway = { submitInvoice: vi.fn().mockResolvedValue({ externalReference: 'remote-id', remoteInvoiceNumber: 'J2026-42' }) }
    await syncFinancialInvoiceToJortt('invoice-id', gateway)
    expect(gateway.submitInvoice).toHaveBeenCalledWith(expect.objectContaining({
      invoiceId: 'invoice-id',
      invoiceNumber: 'WM-2026-000001',
      technicalReference: 'workmatchr-invoice:invoice-id',
    }), 'jortt:invoice:invoice-id')
    expect(mocks.syncUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SYNCED', externalReference: 'remote-id', remoteInvoiceNumber: 'J2026-42' }) }))
    expect(mocks.invoiceFind).toHaveBeenCalledTimes(1)
  })

  it('is idempotent wanneer de sync al geslaagd is', async () => {
    mocks.invoiceFind.mockResolvedValue(invoice('SYNCED'))
    const gateway: JorttGateway = { submitInvoice: vi.fn() }
    await syncFinancialInvoiceToJortt('invoice-id', gateway)
    expect(gateway.submitInvoice).not.toHaveBeenCalled()
    expect(mocks.attemptCreate).not.toHaveBeenCalled()
  })

  it('blokkeert een tweede gelijktijdige poging binnen de processing lease', async () => {
    mocks.invoiceFind.mockResolvedValue(invoice('PROCESSING', new Date('2026-08-25T11:59:00Z')))
    await expect(syncFinancialInvoiceToJortt('invoice-id', { submitInvoice: vi.fn() })).rejects.toThrow('JORTT_SYNC_IN_PROGRESS')
  })

  it('laat providerfalen downstream als RETRY_REQUIRED staan', async () => {
    const gateway: JorttGateway = { submitInvoice: vi.fn().mockRejectedValue(new Error('JORTT_TEMPORARY_PROVIDER_ERROR')) }
    await expect(syncFinancialInvoiceToJortt('invoice-id', gateway)).rejects.toThrow('JORTT_TEMPORARY_PROVIDER_ERROR')
    expect(mocks.syncUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'RETRY_REQUIRED', lastErrorCode: 'JORTT_TEMPORARY_PROVIDER_ERROR' }) }))
  })

  it('verwerkt alleen begrensde vervallen retries', async () => {
    mocks.syncFindMany.mockResolvedValue([{ invoiceId: 'invoice-id' }])
    const gateway: JorttGateway = { submitInvoice: vi.fn().mockResolvedValue({ externalReference: 'remote-id', remoteInvoiceNumber: 'J2026-42' }) }
    const result = await retryDueJorttSyncs(gateway, new Date(), 100)
    expect(result).toEqual([{ invoiceId: 'invoice-id', status: 'SYNCED' }])
    expect(mocks.syncFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 25, where: expect.objectContaining({ status: { in: ['PENDING', 'RETRY_REQUIRED'] } }) }))
  })
})
