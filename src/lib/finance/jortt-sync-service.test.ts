import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  eventFind: vi.fn(), queueCreate: vi.fn(), authorize: vi.fn(), queryRaw: vi.fn(), invoiceFind: vi.fn(), syncUpdate: vi.fn(), attemptCreate: vi.fn(), eventCreate: vi.fn(), eventUpsert: vi.fn(), syncFindMany: vi.fn(),
}))

const prisma = {
  $transaction: vi.fn(async (callback: (transaction: unknown) => unknown) => callback({
    $queryRaw: mocks.queryRaw,
    financialInvoice: { findUnique: mocks.invoiceFind },
    financialJorttSync: { create: mocks.queueCreate, update: mocks.syncUpdate },
    financialJorttSyncAttempt: { create: mocks.attemptCreate },
    financialEvent: { findUnique: mocks.eventFind, create: mocks.eventCreate, upsert: mocks.eventUpsert },
  })),
  financialJorttSync: { findMany: mocks.syncFindMany },
}

vi.mock('@/lib/prisma', () => ({ getPrisma: () => prisma }))

import { retryDueJorttSyncs, syncFinancialInvoiceToJortt, type JorttGateway } from './jortt-sync-service'
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ requirePlatformAdministrator: async () => ({ id: 'operator' }) }))
vi.mock('@/lib/marketplace/marketplace-authorization', () => ({ requireMarketplacePlatformAdmin: mocks.authorize }))
import { holdHistoricalInvoice, releaseHistoricalInvoice } from './pro-historical-recovery'
import type { Prisma } from '@/generated/prisma/client'
import { JorttProviderError } from './jortt-provider-diagnostics'

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
  it('weigert een tweede herstelverzending na een onzekere claim', async () => {
    const policy = await import('./pro-historical-recovery')
    const pin = vi.spyOn(policy, 'historicalRecoveryDate').mockReturnValue('2026-10-04')
    const submitInvoice = vi.fn()
    try {
      for (const status of ['FAILED', 'PROCESSING', 'RETRY_REQUIRED']) {
        const previous = invoice(status)
        mocks.invoiceFind.mockResolvedValue({ ...previous, jorttSync: { ...previous.jorttSync, attemptCount: 1 } })
        await expect(syncFinancialInvoiceToJortt(previous.id, { submitInvoice })).rejects.toThrow('PRO_RECOVERY_JORTT_ATTEMPT_REVIEW')
      }
      expect(submitInvoice).not.toHaveBeenCalled()
    } finally {
      pin.mockRestore()
    }
  })

  it('houdt één herstelpost vast tot afzonderlijke vrijgave en verwerkt een reguliere factuur intussen', async () => {
    const heldId = 'synthetic-held-invoice'
    const eventStore = new Map<string, { invoiceId: string; eventType: string }>()
    const queue = new Map<string, string>([['regular', 'PENDING']])
    const submitInvoice = vi.fn().mockResolvedValue({ externalReference: 'fake-doc', remoteInvoiceNumber: 'F1' })
    const gateway = { submitInvoice }
    mocks.eventCreate.mockImplementation(async ({ data }) => { eventStore.set(data.idempotencyKey, data) })
    mocks.eventFind.mockImplementation(async ({ where }) => eventStore.get(where.idempotencyKey))
    mocks.queueCreate.mockImplementation(async ({ data }) => { queue.set(data.invoiceId, 'PENDING') })
    mocks.invoiceFind.mockImplementation(async ({ where }) => {
      const row = invoice(queue.get(where.id))
      return { ...row, id: where.id, jorttSync: queue.has(where.id) ? { ...row.jorttSync, id: where.id } : null }
    })
    mocks.syncUpdate.mockImplementation(async ({ where, data }) => {
      queue.set(where.id, data.status)
      return { ...invoice().jorttSync, id: where.id, attemptCount: 1, ...data }
    })
    mocks.syncFindMany.mockImplementation(async ({ where }) => [...queue].filter(([, status]) => where.status.in.includes(status)).map(([invoiceId]) => ({ invoiceId })))
    try {
      await prisma.$transaction(tx => holdHistoricalInvoice(tx as Prisma.TransactionClient, heldId, 'operator'))
      await expect(syncFinancialInvoiceToJortt(heldId, gateway)).rejects.toThrow('JORTT_SYNC_NOT_FOUND')
      await retryDueJorttSyncs(gateway)
      expect(submitInvoice.mock.calls.map(([payload]) => payload.invoiceId)).toEqual(['regular'])
      expect(eventStore.get(`pro-recovery-held:${heldId}`)).toMatchObject({ eventType: 'PRO_RECOVERY_JORTT_HELD' })
      await expect(releaseHistoricalInvoice(heldId)).rejects.toThrow('PRO_RECOVERY_RELEASE_NOT_APPROVED')
      vi.stubEnv('PRO_RECOVERY_APPROVED_INVOICE_ID', heldId)
      mocks.authorize.mockRejectedValueOnce(new Error('FORBIDDEN'))
      await expect(releaseHistoricalInvoice(heldId)).rejects.toThrow('FORBIDDEN')
      expect(queue.has(heldId)).toBe(false)
      await releaseHistoricalInvoice(heldId)
      await releaseHistoricalInvoice(heldId)
      await retryDueJorttSyncs(gateway)
      await syncFinancialInvoiceToJortt(heldId, gateway)
      expect(mocks.queueCreate).toHaveBeenCalledTimes(1)
      expect(submitInvoice.mock.calls.map(([payload]) => payload.invoiceId)).toEqual(['regular', heldId])
    } finally {
      vi.unstubAllEnvs()
    }
  })
  it('bewaart veilige providerdiagnostiek bij dezelfde poging zonder retrybeleid of identiteit te wijzigen', async () => {
    const gateway = { submitInvoice: vi.fn().mockRejectedValue(new JorttProviderError('CUSTOMER_CREATE', 422, 'params.invalid')) }
    await expect(syncFinancialInvoiceToJortt('invoice-id', gateway)).rejects.toThrow('JORTT_PROVIDER_REJECTED')
    expect(gateway.submitInvoice).toHaveBeenCalledOnce()
    expect(mocks.attemptCreate).toHaveBeenCalledExactlyOnceWith({ data: { syncId: 'sync-id', attemptNumber: 1, status: 'FAILED', errorCode: 'JORTT_PROVIDER_REJECTED', idempotencyKey: 'jortt:invoice:invoice-id:1' } })
    expect(mocks.eventUpsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({
      invoiceId: 'invoice-id', idempotencyKey: 'jortt-sync-failed:invoice-id:1',
      metadata: { provider: 'JORTT', operation: 'CUSTOMER_CREATE', httpStatus: 422, providerErrorCode: 'params.invalid', category: 'JORTT_CUSTOMER_CREATE_REJECTED', syncId: 'sync-id', attemptNumber: 1 },
    }) }))
    expect(mocks.syncUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'RETRY_REQUIRED', lastErrorCode: 'JORTT_PROVIDER_REJECTED', nextAttemptAt: new Date('2026-08-25T12:02:00Z') }) }))
  })
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
    }), 'jortt:invoice:invoice-id', expect.objectContaining({ claimCreation: expect.any(Function), saveDraftId: expect.any(Function) }))
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
    }), 'jortt:invoice:invoice-id', expect.objectContaining({ claimCreation: expect.any(Function), saveDraftId: expect.any(Function) }))
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
