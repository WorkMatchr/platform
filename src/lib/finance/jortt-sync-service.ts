import 'server-only'

import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'

const PROCESSING_LEASE_MS = 5 * 60 * 1000

export type JorttInvoicePayload = Readonly<{
  invoiceId: string
  technicalReference: string
  knownExternalReference: string | null
  organizationId: string
  invoiceNumber: string
  documentType: 'INVOICE' | 'CREDIT_NOTE'
  pricingMode: 'STANDARD' | 'MOLLIE_TEST_ACCEPTANCE'
  issuedAt: string
  supplyDate: string | null
  servicePeriodStart: string | null
  servicePeriodEnd: string | null
  seller: Readonly<{ legalName: string; kvkNumber: string; vatId: string }>
  customer: Readonly<{
    organizationName: string
    addressLine: string
    postalCode: string
    city: string
    countryCode: string
    kvkNumber: string | null
    vatId: string | null
  }>
  amountExclVatCents: number
  vatRateBps: number
  vatAmountCents: number
  amountInclVatCents: number
  currency: string
  paymentReference: string | null
  originalInvoiceExternalReference: string | null
  lines: ReadonlyArray<Readonly<{
    description: string
    quantity: number
    unit: string
    unitPriceExclVatCents: number
    discountAmountCents: number
    netAmountExclVatCents: number
    vatRateBps: number
    vatAmountCents: number
  }>>
}>

export interface JorttGateway {
  submitInvoice(payload: JorttInvoicePayload, idempotencyKey: string): Promise<{ externalReference: string; remoteInvoiceNumber: string }>
}

export class UnconfiguredJorttGateway implements JorttGateway {
  async submitInvoice(): Promise<never> {
    throw new Error('JORTT_EXTERNAL_CONNECTOR_NOT_CONFIGURED')
  }
}

function safeErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  return /^[A-Z0-9_]{3,80}$/.test(message) ? message : 'JORTT_PROVIDER_ERROR'
}

function buildPayload(invoice: {
  id: string
  organizationId: string
  invoiceNumber: string
  documentType: 'INVOICE' | 'CREDIT_NOTE'
  pricingMode: 'STANDARD' | 'MOLLIE_TEST_ACCEPTANCE'
  issuedAt: Date
  supplyDate: Date | null
  servicePeriodStart: Date | null
  servicePeriodEnd: Date | null
  sellerLegalName: string
  sellerKvKNumber: string
  sellerVatId: string
  customerOrganizationName: string
  customerAddressLine: string
  customerPostalCode: string
  customerCity: string
  customerCountryCode: string
  customerKvKNumber: string | null
  customerVatId: string | null
  amountExclVatCents: number
  vatRateBps: number
  vatAmountCents: number
  amountInclVatCents: number
  currency: string
  molliePaymentId: string | null
  lines: Array<{ description: string; quantity: number; unit: string; unitPriceExclVatCents: number; discountAmountCents: number; netAmountExclVatCents: number; vatRateBps: number; vatAmountCents: number }>
  jorttSync: { externalReference: string | null; technicalReference: string | null } | null
  originalInvoice: { jorttSync: { externalReference: string | null } | null } | null
}): JorttInvoicePayload {
  return Object.freeze({
    invoiceId: invoice.id,
    technicalReference: invoice.jorttSync?.technicalReference ?? `workmatchr-invoice:${invoice.id}`,
    knownExternalReference: invoice.jorttSync?.externalReference ?? null,
    organizationId: invoice.organizationId,
    invoiceNumber: invoice.invoiceNumber,
    documentType: invoice.documentType,
    pricingMode: invoice.pricingMode,
    issuedAt: invoice.issuedAt.toISOString(),
    supplyDate: invoice.supplyDate?.toISOString() ?? null,
    servicePeriodStart: invoice.servicePeriodStart?.toISOString() ?? null,
    servicePeriodEnd: invoice.servicePeriodEnd?.toISOString() ?? null,
    seller: Object.freeze({ legalName: invoice.sellerLegalName, kvkNumber: invoice.sellerKvKNumber, vatId: invoice.sellerVatId }),
    customer: Object.freeze({
      organizationName: invoice.customerOrganizationName,
      addressLine: invoice.customerAddressLine,
      postalCode: invoice.customerPostalCode,
      city: invoice.customerCity,
      countryCode: invoice.customerCountryCode,
      kvkNumber: invoice.customerKvKNumber,
      vatId: invoice.customerVatId,
    }),
    amountExclVatCents: invoice.amountExclVatCents,
    vatRateBps: invoice.vatRateBps,
    vatAmountCents: invoice.vatAmountCents,
    amountInclVatCents: invoice.amountInclVatCents,
    currency: invoice.currency,
    paymentReference: invoice.molliePaymentId,
    originalInvoiceExternalReference: invoice.originalInvoice?.jorttSync?.externalReference ?? null,
    lines: Object.freeze(invoice.lines.map((line) => Object.freeze({ ...line }))),
  })
}

export async function syncFinancialInvoiceToJortt(
  invoiceId: string,
  gateway: JorttGateway = new UnconfiguredJorttGateway(),
) {
  const claimedAt = new Date()
  const claimed = await getPrisma().$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`jortt:${invoiceId}`}, 0))::text AS "lock"`)
    const invoice = await transaction.financialInvoice.findUnique({
      where: { id: invoiceId },
      include: { jorttSync: true, lines: { orderBy: { position: 'asc' } }, originalInvoice: { include: { jorttSync: true } } },
    })
    if (!invoice?.jorttSync) throw new Error('JORTT_SYNC_NOT_FOUND')
    if (invoice.jorttSync.status === 'SYNCED') return { invoice, sync: invoice.jorttSync, idempotent: true }
    if (
      invoice.jorttSync.status === 'PROCESSING'
      && invoice.jorttSync.updatedAt.getTime() > claimedAt.getTime() - PROCESSING_LEASE_MS
    ) throw new Error('JORTT_SYNC_IN_PROGRESS')
    const sync = await transaction.financialJorttSync.update({
      where: { id: invoice.jorttSync.id },
      data: {
        status: 'PROCESSING',
        attemptCount: { increment: 1 },
        lastErrorCode: null,
        technicalReference: invoice.jorttSync.technicalReference ?? `workmatchr-invoice:${invoice.id}`,
      },
    })
    return { invoice, sync, idempotent: false }
  }, { isolationLevel: 'Serializable' })
  if (claimed.idempotent) return claimed.sync
  const attemptNumber = claimed.sync.attemptCount
  const idempotencyKey = `jortt:invoice:${claimed.invoice.id}`
  try {
    const result = await gateway.submitInvoice(buildPayload(claimed.invoice), idempotencyKey)
    return getPrisma().$transaction(async (transaction) => {
      await transaction.financialJorttSyncAttempt.create({
        data: { syncId: claimed.sync.id, attemptNumber, status: 'SYNCED', externalReference: result.externalReference, idempotencyKey: `${idempotencyKey}:${attemptNumber}` },
      })
      const sync = await transaction.financialJorttSync.update({
        where: { id: claimed.sync.id },
        data: { status: 'SYNCED', externalReference: result.externalReference, remoteInvoiceNumber: result.remoteInvoiceNumber, syncedAt: new Date(), nextAttemptAt: null },
      })
      await transaction.financialEvent.create({
        data: { invoiceId, eventType: 'JORTT_SYNC_COMPLETED', result: 'SUCCEEDED', idempotencyKey: `jortt-sync-completed:${invoiceId}`, metadata: { externalReference: result.externalReference, remoteInvoiceNumber: result.remoteInvoiceNumber } },
      })
      return sync
    })
  } catch (error) {
    const errorCode = safeErrorCode(error)
    await getPrisma().$transaction(async (transaction) => {
      await transaction.financialJorttSyncAttempt.create({
        data: { syncId: claimed.sync.id, attemptNumber, status: 'FAILED', errorCode, idempotencyKey: `${idempotencyKey}:${attemptNumber}` },
      })
      await transaction.financialJorttSync.update({
        where: { id: claimed.sync.id },
        data: { status: errorCode === 'JORTT_EXTERNAL_CONNECTOR_NOT_CONFIGURED' ? 'FAILED' : 'RETRY_REQUIRED', lastErrorCode: errorCode, nextAttemptAt: new Date(Date.now() + Math.min(86_400_000, 60_000 * 2 ** Math.min(attemptNumber, 10))) },
      })
      await transaction.financialEvent.upsert({
        where: { idempotencyKey: `jortt-sync-failed:${invoiceId}:${attemptNumber}` },
        create: { invoiceId, eventType: 'JORTT_SYNC_FAILED', result: 'FAILED', reason: errorCode, idempotencyKey: `jortt-sync-failed:${invoiceId}:${attemptNumber}` },
        update: {},
      })
    })
    throw new Error(errorCode)
  }
}

export async function retryDueJorttSyncs(gateway: JorttGateway, at = new Date(), limit = 10) {
  const boundedLimit = Math.max(1, Math.min(limit, 25))
  const due = await getPrisma().financialJorttSync.findMany({
    where: {
      status: { in: ['PENDING', 'RETRY_REQUIRED'] },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: at } }],
    },
    select: { invoiceId: true },
    orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
    take: boundedLimit,
  })
  const results: Array<{ invoiceId: string; status: 'SYNCED' | 'FAILED'; errorCode?: string }> = []
  for (const item of due) {
    try {
      await syncFinancialInvoiceToJortt(item.invoiceId, gateway)
      results.push({ invoiceId: item.invoiceId, status: 'SYNCED' })
    } catch (error) {
      results.push({
        invoiceId: item.invoiceId,
        status: 'FAILED',
        errorCode: safeErrorCode(error),
      })
    }
  }
  return results
}
