import 'server-only'
import { ArboGuideRunError } from '@/lib/arbo-guides/arbo-guide-run-service'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { runSerializableFinancialTransaction } from '@/lib/finance/financial-transaction'
import { createFinancialPurchaseCheckout } from '@/lib/finance/financial-purchase-service'
import type { MollieGateway } from '@/lib/finance/mollie-gateway'
import { f4Price, type F4PriceProduct } from './compliance-f4-pricing'
import { assertF4DraftActor } from './compliance-f4-draft-authorization'

// Approved tariff, separate from commercial activation. Only isolated synthetic checkout is exposed by this preparation.
const billingSchema = z.object({ organizationName: z.string().min(2).max(200), addressLine: z.string().min(2).max(200), postalCode: z.string().min(2).max(20), city: z.string().min(2).max(120), countryCode: z.literal('NL') }).strict()
export async function prepareSyntheticF4Purchase(actor: { userId: string; organizationId: string }, runId: string, billing: unknown, gateway: MollieGateway, product: F4PriceProduct = 'FIRST_SCAN') {
  // Explicit isolated acceptance only, and never an implicit live gateway.
  const database = new URL(process.env.DATABASE_URL ?? 'invalid:')
  if (process.env.F4_SYNTHETIC_ACCEPTANCE !== 'true' || !['127.0.0.1', 'localhost'].includes(database.hostname) || !database.pathname.startsWith('/workmatchr_compliance_f1_test_') || process.env.VERCEL) throw new Error('SYNTHETIC_ACCEPTANCE_ONLY')
  z.string().uuid().parse(runId)
  const address = billingSchema.parse(billing)
  const price = f4Price(product)
  const purchase = await runSerializableFinancialTransaction(async tx => {
    await assertF4DraftActor(tx, actor)
    const draft = await tx.arboGuideRun.findUniqueOrThrow({ where: { id: runId } })
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`arbo-guide-run:${actor.organizationId}:${draft.idempotencyKey}`}, 0))::text`)
    if (draft.organizationId !== actor.organizationId || draft.completedByUserId !== actor.userId || draft.status !== 'IN_PROGRESS' || draft.draftRevision === null) throw new Error('ACCESS_DENIED')
    const existing = await tx.financialPurchase.findUnique({ where: { complianceRunId: runId } })
    if (existing) {
      if (existing.packageSku !== price.packageSku || existing.amountExclVatCents !== price.amountExclVatCents || existing.vatAmountCents !== price.vatAmountCents) throw new Error('PRICE_CONFLICT')
      return existing
    }
    const created = await tx.financialPurchase.create({ data: {
      kind: 'COMPLIANCE_SCAN', complianceRunId: runId, organizationId: actor.organizationId, createdByUserId: actor.userId,
      packageSku: price.packageSku, packageLabel: price.packageLabel, credits: 0,
      baseAmountCents: price.amountExclVatCents, amountExclVatCents: price.amountExclVatCents, vatRateBps: price.vatRateBps, vatAmountCents: price.vatAmountCents, amountInclVatCents: price.amountInclVatCents, currency: price.currency,
      billingOrganizationName: address.organizationName, billingAddressLine: address.addressLine, billingPostalCode: address.postalCode, billingCity: address.city, billingCountryCode: address.countryCode,
      idempotencyKey: `compliance-purchase:${runId}`,
    } })
    await tx.financialEvent.create({ data: { purchaseId: created.id, actorUserId: actor.userId, eventType: 'PURCHASE_CREATED', result: 'SUCCEEDED', idempotencyKey: `purchase-created:${created.id}`, metadata: { priceContractVersion: price.contractVersion, product: price.product, eligibility: product === 'FOLLOW_UP_SCAN' ? 'SYNTHETIC_ONLY_NOT_APPROVED' : 'FIRST_SCAN', amountExclVatCents: price.amountExclVatCents, vatAmountCents: price.vatAmountCents, amountInclVatCents: price.amountInclVatCents } } })
    return created
  })
  return createFinancialPurchaseCheckout(purchase, gateway, '/wijzers/compliance/v2')
}

export async function assertF4PaidAccess(tx: Prisma.TransactionClient, run: { id: string; organizationId: string; completedByUserId: string }) {
  const purchase = await tx.financialPurchase.findUnique({ where: { complianceRunId: run.id } })
  if (!purchase) throw new ArboGuideRunError('PAYMENT_REQUIRED')
  // Same lock as verified webhooks/refunds: no access based on a redirect or browser status.
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`finance:purchase:${purchase.id}`}, 0))::text`)
  const current = await tx.financialPurchase.findUniqueOrThrow({ where: { id: purchase.id } })
  if (current.kind !== 'COMPLIANCE_SCAN' || current.organizationId !== run.organizationId || current.createdByUserId !== run.completedByUserId || current.status !== 'PAID' || !current.paidAt || !current.molliePaymentId) throw new ArboGuideRunError('PAYMENT_REQUIRED')
}
