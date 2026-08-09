import 'server-only'

import { createHash } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import {
  recordVerifiedDiscountBonusInTransaction,
  recordVerifiedPurchaseCreditsInTransaction,
} from '@/lib/credits/credit-wallet-service'
import { requireProviderMarketplaceAccess } from '@/lib/marketplace/marketplace-authorization'
import { MarketplaceServiceError } from '@/lib/marketplace/marketplace-errors'
import {
  createCreditPurchaseSchema,
  previewCreditPurchaseSchema,
  type CreditPackageSku,
  type DiscountSnapshot,
} from './financial-contract'
import {
  centsToMollieValue,
  createMollieGateway,
  getMollieUrls,
  mollieValueToCents,
  type MollieGateway,
  type MolliePaymentSnapshot,
} from './mollie-gateway'
import { issueInvoiceForPaidPurchase } from './invoice-service'
import { activateProAfterFirstPayment, processRecurringProPayment } from './subscription-service'
import { runSerializableFinancialTransaction } from './financial-transaction'
import { findEffectiveProSubscription } from './pro-entitlement-service'
import {
  calculateAuthoritativeMollieCreditPrice,
  MOLLIE_SANDBOX_ACCEPTANCE_PRICING,
  usesMollieTestAcceptancePrice,
} from './mollie-test-pricing'

type Transaction = Prisma.TransactionClient

async function lockKey(transaction: Transaction, key: string) {
  await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`finance:${key}`}, 0))::text AS "lock"`)
}

async function resolveDiscount(
  transaction: Transaction,
  input: { code?: string; organizationId: string; packageSku: string; packagePriceCents: number; hasActivePro: boolean },
): Promise<{ id: string; snapshot: DiscountSnapshot } | null> {
  if (!input.code) return null
  if (input.hasActivePro) throw new MarketplaceServiceError('VALIDATION_ERROR')
  const code = input.code.trim().toUpperCase()
  await lockKey(transaction, `discount:${code}`)
  const now = new Date()
  const discount = await transaction.discountCode.findUnique({ where: { code } })
  if (!discount || discount.status !== 'ACTIVE' || discount.validFrom > now || (discount.validUntil && discount.validUntil <= now)) {
    throw new MarketplaceServiceError('VALIDATION_ERROR')
  }
  if (discount.applicablePackageSkus.length > 0 && !discount.applicablePackageSkus.includes(input.packageSku)) {
    throw new MarketplaceServiceError('VALIDATION_ERROR')
  }
  if (discount.minimumAmountCents !== null && input.packagePriceCents < discount.minimumAmountCents) {
    throw new MarketplaceServiceError('VALIDATION_ERROR')
  }
  const activeUses = await transaction.discountRedemption.count({ where: { discountCodeId: discount.id, status: { in: ['RESERVED', 'APPLIED'] } } })
  if (discount.maximumUses !== null && activeUses >= discount.maximumUses) throw new MarketplaceServiceError('CONFLICT')
  if (discount.oncePerOrganization) {
    const used = await transaction.discountRedemption.findFirst({
      where: { discountCodeId: discount.id, organizationId: input.organizationId, status: { in: ['RESERVED', 'APPLIED'] } },
      select: { id: true },
    })
    if (used) throw new MarketplaceServiceError('CONFLICT')
  }
  if (discount.newCustomersOnly) {
    const previousPaid = await transaction.financialPurchase.findFirst({
      where: { organizationId: input.organizationId, status: { in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] } },
      select: { id: true },
    })
    if (previousPaid) throw new MarketplaceServiceError('VALIDATION_ERROR')
  }
  const configuredValues = [discount.percentageBps !== null, discount.fixedAmountCents !== null, discount.bonusCredits > 0].filter(Boolean).length
  if (configuredValues !== 1) throw new MarketplaceServiceError('CONFLICT')
  return {
    id: discount.id,
    snapshot: Object.freeze({
      code: discount.code,
      percentageBps: discount.percentageBps,
      fixedAmountCents: discount.fixedAmountCents,
      bonusCredits: discount.bonusCredits,
    }),
  }
}

async function resolveCreditPurchasePrice(
  transaction: Transaction,
  input: { organizationId: string; packageSku: CreditPackageSku; discountCode?: string },
) {
  const usesTestAcceptancePrice = usesMollieTestAcceptancePrice(input.packageSku)
  const hasActivePro = usesTestAcceptancePrice
    ? false
    : Boolean(await findEffectiveProSubscription(transaction, input.organizationId))
  const basePrice = calculateAuthoritativeMollieCreditPrice({
    packageSku: input.packageSku,
    hasActivePro,
  })
  const discount = usesTestAcceptancePrice
    ? null
    : await resolveDiscount(transaction, {
        code: input.discountCode,
        organizationId: input.organizationId,
        packageSku: input.packageSku,
        packagePriceCents: basePrice.amountExclVatCents,
        hasActivePro,
      })
  const price = calculateAuthoritativeMollieCreditPrice({
    packageSku: input.packageSku,
    hasActivePro,
    discount: discount?.snapshot,
  })
  return { discount, price }
}

export async function previewCreditPurchasePrice(input: unknown) {
  const values = previewCreditPurchaseSchema.parse(input)
  return runSerializableFinancialTransaction(async (transaction) => {
    await requireProviderMarketplaceAccess(transaction, values.actorUserId, values.organizationId, true)
    return (await resolveCreditPurchasePrice(transaction, values)).price
  })
}

export async function createCreditPurchase(
  input: unknown,
  gateway: MollieGateway = createMollieGateway(),
) {
  const values = createCreditPurchaseSchema.parse(input)
  const purchase = await runSerializableFinancialTransaction(async (transaction) => {
    await lockKey(transaction, `purchase:${values.idempotencyKey}`)
    const existing = await transaction.financialPurchase.findUnique({ where: { idempotencyKey: values.idempotencyKey } })
    if (existing) {
      if (existing.organizationId !== values.organizationId || existing.packageSku !== values.packageSku) throw new MarketplaceServiceError('CONFLICT')
      return existing
    }
    await requireProviderMarketplaceAccess(transaction, values.actorUserId, values.organizationId, true)
    const { discount, price } = await resolveCreditPurchasePrice(transaction, values)
    const created = await transaction.financialPurchase.create({
      data: {
        organizationId: values.organizationId,
        createdByUserId: values.actorUserId,
        pricingMode: price.pricingMode,
        packageSku: price.packageSku,
        packageLabel: price.packageLabel,
        credits: price.credits,
        baseAmountCents: price.baseAmountCents,
        packageDiscountCents: price.packageDiscountCents,
        proDiscountCents: price.proDiscountCents,
        discountCodeDiscountCents: price.discountCodeDiscountCents,
        amountExclVatCents: price.amountExclVatCents,
        vatRateBps: price.vatRateBps,
        vatAmountCents: price.vatAmountCents,
        amountInclVatCents: price.amountInclVatCents,
        currency: price.currency,
        discountCodeId: discount?.id,
        discountCodeSnapshot: discount?.snapshot,
        billingOrganizationName: values.billingAddress.organizationName,
        billingAddressLine: values.billingAddress.addressLine,
        billingPostalCode: values.billingAddress.postalCode,
        billingCity: values.billingAddress.city,
        billingCountryCode: values.billingAddress.countryCode,
        billingKvKNumber: values.billingAddress.chamberOfCommerceNumber,
        billingVatId: values.billingAddress.vatId,
        idempotencyKey: values.idempotencyKey,
      },
    })
    if (discount) {
      await transaction.discountRedemption.create({
        data: {
          discountCodeId: discount.id,
          organizationId: values.organizationId,
          purchaseId: created.id,
          discountCents: price.discountCodeDiscountCents,
          bonusCredits: price.bonusCredits,
          idempotencyKey: `discount-reservation:${created.id}`,
        },
      })
    }
    await transaction.financialEvent.create({
      data: {
        actorUserId: values.actorUserId,
        purchaseId: created.id,
        eventType: 'PURCHASE_CREATED',
        result: 'SUCCEEDED',
        idempotencyKey: `purchase-created:${created.id}`,
        metadata: {
          packageSku: created.packageSku,
          pricingMode: created.pricingMode,
          pricingPolicy: created.pricingMode === 'MOLLIE_TEST_ACCEPTANCE'
            ? MOLLIE_SANDBOX_ACCEPTANCE_PRICING
            : 'STANDARD',
          amountExclVatCents: created.amountExclVatCents,
          vatAmountCents: created.vatAmountCents,
          amountInclVatCents: created.amountInclVatCents,
          currency: created.currency,
        },
      },
    })
    return created
  })

  if (purchase.molliePaymentId && purchase.mollieCheckoutUrl) return purchase
  const { webhookBaseUrl, redirectBaseUrl } = getMollieUrls()
  const payment = await gateway.createPayment({
    amountValue: centsToMollieValue(purchase.amountInclVatCents),
    currency: 'EUR',
    description: purchase.pricingMode === 'MOLLIE_TEST_ACCEPTANCE'
      ? `WorkMatchr ${purchase.packageLabel} - sandboxacceptatie`
      : `WorkMatchr ${purchase.packageLabel}`,
    redirectUrl: new URL(`/credits/betaling/${purchase.id}`, redirectBaseUrl).toString(),
    webhookUrl: new URL('/api/payments/mollie/webhook', webhookBaseUrl).toString(),
    metadata: { purchaseId: purchase.id, organizationId: purchase.organizationId },
    idempotencyKey: `mollie-purchase-${purchase.id}`,
  })
  if (!payment.checkoutUrl) throw new Error('MOLLIE_CHECKOUT_URL_MISSING')
  return runSerializableFinancialTransaction(async (transaction) => {
    await lockKey(transaction, `purchase:${purchase.id}`)
    const current = await transaction.financialPurchase.findUniqueOrThrow({ where: { id: purchase.id } })
    if (current.molliePaymentId && current.molliePaymentId !== payment.id) throw new MarketplaceServiceError('CONFLICT')
    const updated = await transaction.financialPurchase.update({
      where: { id: purchase.id },
      data: {
        status: 'PAYMENT_PENDING',
        molliePaymentId: payment.id,
        mollieCheckoutUrl: payment.checkoutUrl,
        paymentCreatedAt: payment.createdAt ? new Date(payment.createdAt) : new Date(),
      },
    })
    await transaction.financialEvent.upsert({
      where: { idempotencyKey: `mollie-payment-created:${payment.id}` },
      create: {
        actorUserId: purchase.createdByUserId,
        purchaseId: purchase.id,
        eventType: 'MOLLIE_PAYMENT_CREATED',
        result: 'SUCCEEDED',
        idempotencyKey: `mollie-payment-created:${payment.id}`,
        metadata: {
          molliePaymentId: payment.id,
          pricingMode: purchase.pricingMode,
          pricingPolicy: purchase.pricingMode === 'MOLLIE_TEST_ACCEPTANCE'
            ? MOLLIE_SANDBOX_ACCEPTANCE_PRICING
            : 'STANDARD',
          amountInclVatCents: purchase.amountInclVatCents,
          currency: purchase.currency,
        },
      },
      update: {},
    })
    return updated
  })
}

function fingerprintPayment(payment: MolliePaymentSnapshot) {
  return createHash('sha256').update(JSON.stringify({
    id: payment.id,
    status: payment.status,
    amountValue: payment.amountValue,
    currency: payment.currency,
    metadata: payment.metadata,
    paidAt: payment.paidAt,
    subscriptionId: payment.subscriptionId,
    mandateId: payment.mandateId,
    method: payment.method,
  })).digest('hex')
}

function mapStatus(status: MolliePaymentSnapshot['status']) {
  return status === 'canceled' ? 'CANCELED' : status.toUpperCase() as 'OPEN' | 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED'
}

export async function processMolliePayment(
  paymentId: string,
  gateway: MollieGateway = createMollieGateway(),
) {
  const payment = await gateway.getPayment(paymentId)
  const purchase = await getPrisma().financialPurchase.findUnique({ where: { molliePaymentId: payment.id } })
  if (!purchase) return processRecurringProPayment(payment)
  const amountCents = mollieValueToCents(payment.amountValue)
  const valid = payment.metadata.purchaseId === purchase.id
    && payment.metadata.organizationId === purchase.organizationId
    && payment.currency === purchase.currency
    && amountCents === purchase.amountInclVatCents
  if (!valid) {
    await getPrisma().financialEvent.upsert({
      where: { idempotencyKey: `payment-rejected:${payment.id}:${fingerprintPayment(payment)}` },
      create: {
        purchaseId: purchase.id,
        eventType: 'PAYMENT_VERIFICATION_REJECTED',
        result: 'REJECTED',
        reason: 'Server-side paymentcontrole heeft een mismatch vastgesteld.',
        idempotencyKey: `payment-rejected:${payment.id}:${fingerprintPayment(payment)}`,
        metadata: { molliePaymentId: payment.id, amountMatches: amountCents === purchase.amountInclVatCents, currencyMatches: payment.currency === purchase.currency },
      },
      update: {},
    })
    throw new Error('MOLLIE_PAYMENT_MISMATCH')
  }
  const fingerprint = fingerprintPayment(payment)
  const result = await runSerializableFinancialTransaction(async (transaction) => {
    await lockKey(transaction, `purchase:${purchase.id}`)
    const current = await transaction.financialPurchase.findUniqueOrThrow({ where: { id: purchase.id } })
    await transaction.financialPaymentEvent.upsert({
      where: { idempotencyKey: `payment-state:${payment.id}:${fingerprint}` },
      create: {
        purchaseId: current.id,
        molliePaymentId: payment.id,
        status: mapStatus(payment.status),
        amountCents,
        currency: payment.currency,
        providerOccurredAt: payment.paidAt ? new Date(payment.paidAt) : null,
        payloadFingerprint: fingerprint,
        idempotencyKey: `payment-state:${payment.id}:${fingerprint}`,
      },
      update: {},
    })
    if (payment.status === 'paid') {
      if (current.status !== 'PAID') {
        await transaction.financialPurchase.update({
          where: { id: current.id },
          data: { status: 'PAID', paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(), terminalAt: new Date() },
        })
      }
      if (current.kind === 'CREDIT_PACKAGE') {
        await recordVerifiedPurchaseCreditsInTransaction(transaction, {
          purchaseId: current.id,
          idempotencyKey: `financial-purchase:${current.id}`,
        })
        await transaction.discountRedemption.updateMany({
          where: { purchaseId: current.id, status: 'RESERVED' },
          data: { status: 'APPLIED', appliedAt: new Date() },
        })
        await recordVerifiedDiscountBonusInTransaction(transaction, {
          purchaseId: current.id,
          idempotencyKey: `financial-discount-bonus:${current.id}`,
        })
      }
      const invoice = await issueInvoiceForPaidPurchase(transaction, current.id)
      return { purchaseId: current.id, kind: current.kind, status: 'PAID' as const, invoiceId: invoice.id }
    }
    if (['failed', 'canceled', 'expired'].includes(payment.status)) {
      const status = payment.status === 'canceled' ? 'CANCELED' : payment.status.toUpperCase() as 'FAILED' | 'EXPIRED'
      await transaction.financialPurchase.update({ where: { id: current.id }, data: { status, terminalAt: new Date() } })
      await transaction.discountRedemption.updateMany({
        where: { purchaseId: current.id, status: 'RESERVED' },
        data: { status: 'RELEASED', releasedAt: new Date() },
      })
      return { purchaseId: current.id, kind: current.kind, status, invoiceId: null }
    }
    await transaction.financialPurchase.update({ where: { id: current.id }, data: { status: 'PAYMENT_PENDING' } })
    return { purchaseId: current.id, kind: current.kind, status: 'PAYMENT_PENDING' as const, invoiceId: null }
  })
  if (result.status === 'PAID' && result.kind === 'PRO_SUBSCRIPTION') {
    const subscription = await getPrisma().professionalSubscription.findUnique({ where: { firstPaymentPurchaseId: result.purchaseId } })
    if (!subscription) throw new Error('PRO_SUBSCRIPTION_MISSING')
    await activateProAfterFirstPayment(subscription.id, gateway)
  }
  return result
}
