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
    snapshotVersion: 2, packageLabel: '100 credits',
    id: 'invoice-id', organizationId: 'organization-id', invoiceNumber: 'WM-2026-000001', documentType: 'INVOICE', pricingMode: 'STANDARD', issuedAt: new Date('2026-08-25T10:00:00Z'), supplyDate: new Date('2026-08-25T10:00:00Z'), servicePeriodStart: null, servicePeriodEnd: null,
    sellerLegalName: 'WorkMatchr', sellerKvKNumber: '12345678', sellerVatId: 'NL123456789B01', customerOrganizationName: 'Test B.V.', customerAddressLine: 'Teststraat 1', customerPostalCode: '1234 AB', customerCity: 'Utrecht', customerCountryCode: 'NL', customerKvKNumber: null, customerVatId: null,
    amountExclVatCents: 10_000, vatRateBps: 2_100, vatAmountCents: 2_100, amountInclVatCents: 12_100, currency: 'EUR', molliePaymentId: 'tr_test', originalInvoice: null,
    lines: [{ description: 'Credits', quantity: 100, unit: 'credit', unitPriceExclVatCents: 100, discountAmountCents: 0, netAmountExclVatCents: 10_000, vatRateBps: 2_100, vatAmountCents: 2_100 }],
    jorttSync: { id: 'sync-id', status, attemptCount: 0, updatedAt, externalReference: null, remoteInvoiceNumber: null, technicalReference: null },
  }
}

describe('Jortt synchronisatieservice', () => {
  it('onderhoud verwerkt andere retries en selecteert geen terminale testhistorie', async () => {
    mocks.syncFindMany.mockImplementation(async ({ where }) => {
      const records = [
        { invoiceId: '516a2763-7d62-47ce-aaad-8e2bc63d067e', status: 'FAILED' },
        { invoiceId: 'cf9c9bac-56f9-45bb-994c-d6a1b596ff1e', status: 'FAILED' },
        { invoiceId: '63831bd7-277a-48a7-b328-a3d7ed7eb099', status: 'FAILED' },
        { invoiceId: 'invoice-id', status: 'RETRY_REQUIRED' },
      ]
      return records.filter((record) => where.status.in.includes(record.status))
    })
    const submitInvoice = vi.fn().mockResolvedValue({ externalReference: 'remote', remoteInvoiceNumber: 'J1' })
    expect(await retryDueJorttSyncs({ submitInvoice })).toEqual([{ invoiceId: 'invoice-id', status: 'SYNCED' }])
    expect(submitInvoice).toHaveBeenCalledOnce()
  })
  it.each(['516a2763-7d62-47ce-aaad-8e2bc63d067e', 'cf9c9bac-56f9-45bb-994c-d6a1b596ff1e', '63831bd7-277a-48a7-b328-a3d7ed7eb099'])('blokkeert retired %s vóór claim/provider', async (invoiceId) => {
    const source = invoice('FAILED')
    mocks.invoiceFind.mockResolvedValue({ ...source, id: invoiceId, jorttSync: { ...source.jorttSync, invoiceId, lastErrorCode: 'LEGACY_TEST_DATA' } })
    const submitInvoice = vi.fn()
    await expect(syncFinancialInvoiceToJortt(invoiceId, { submitInvoice })).rejects.toThrow('JORTT_SYNC_RETIRED')
    expect(submitInvoice).not.toHaveBeenCalled()
    expect(mocks.syncUpdate).not.toHaveBeenCalled()
    expect(mocks.attemptCreate).not.toHaveBeenCalled()
  })
  it.each([[100, 21, 121, '25 credits'], [5000, 1050, 6050, '50 credits']] as const)('mapt v1 %i cent zonder opgeslagen regels', async (net, vat, total, label) => {
    const source = { ...invoice(), snapshotVersion: 1, packageLabel: label, lines: [], vatSummaries: [], amountExclVatCents: net, vatAmountCents: vat, amountInclVatCents: total }
    const original = structuredClone(source)
    mocks.invoiceFind.mockResolvedValue(source)
    const submitInvoice = vi.fn().mockResolvedValue({ externalReference: 'remote-id', remoteInvoiceNumber: 'J1' })
    await syncFinancialInvoiceToJortt(source.id, { submitInvoice })
    expect(submitInvoice).toHaveBeenCalledWith(expect.objectContaining({
      issuedAt: source.issuedAt.toISOString(), currency: 'EUR', technicalReference: 'workmatchr-invoice:invoice-id',
      amountExclVatCents: net, vatAmountCents: vat, amountInclVatCents: total,
      lines: [{ description: label, quantity: 1, unit: 'pakket', unitPriceExclVatCents: net, discountAmountCents: 0, netAmountExclVatCents: net, vatRateBps: 2100, vatAmountCents: vat }],
    }), 'jortt:invoice:invoice-id')
    expect(source).toEqual(original)
    mocks.invoiceFind.mockResolvedValue({ ...source, jorttSync: { ...source.jorttSync, status: 'SYNCED' } })
    await syncFinancialInvoiceToJortt(source.id, { submitInvoice })
    expect(submitInvoice).toHaveBeenCalledTimes(1)
  })

  it.each([[100, 21, 122], [100, 20, 120]])('weigert v1 inconsistente historische totalen', async (net, vat, total) => {
    mocks.invoiceFind.mockResolvedValue({ ...invoice(), snapshotVersion: 1, lines: [], amountExclVatCents: net, vatAmountCents: vat, amountInclVatCents: total })
    const submitInvoice = vi.fn()
    await expect(syncFinancialInvoiceToJortt('invoice-id', { submitInvoice })).rejects.toThrow('JORTT_INVOICE_TOTAL_MISMATCH')
    expect(submitInvoice).not.toHaveBeenCalled()
  })

  it('behoudt v2-regels zonder reconstructie', async () => {
    const source = invoice()
    const submitInvoice = vi.fn().mockResolvedValue({ externalReference: 'remote-id', remoteInvoiceNumber: 'J1' })
    await syncFinancialInvoiceToJortt(source.id, { submitInvoice })
    expect(submitInvoice.mock.calls[0][0].lines).toEqual(source.lines)
  })

  it('reconstrueert nooit ontbrekende v2-regels', async () => {
    mocks.invoiceFind.mockResolvedValue({ ...invoice(), lines: [] })
    const submitInvoice = vi.fn().mockRejectedValue(new Error('JORTT_INVOICE_TOTAL_MISMATCH'))
    await expect(syncFinancialInvoiceToJortt('invoice-id', { submitInvoice })).rejects.toThrow('JORTT_INVOICE_TOTAL_MISMATCH')
    expect(submitInvoice.mock.calls[0][0].lines).toEqual([])
  })

  it('laat het bestaande v1-creditnotapad ongewijzigd', async () => {
    mocks.invoiceFind.mockResolvedValue({ ...invoice(), snapshotVersion: 1, documentType: 'CREDIT_NOTE', lines: [], originalInvoice: { jorttSync: { externalReference: 'original-remote' } } })
    const submitInvoice = vi.fn().mockResolvedValue({ externalReference: 'credit-remote', remoteInvoiceNumber: 'C1' })
    await syncFinancialInvoiceToJortt('invoice-id', { submitInvoice })
    expect(submitInvoice.mock.calls[0][0]).toMatchObject({ documentType: 'CREDIT_NOTE', lines: [], originalInvoiceExternalReference: 'original-remote' })
  })

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
