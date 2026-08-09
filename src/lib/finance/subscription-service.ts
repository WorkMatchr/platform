import 'server-only'

import { Prisma } from '@/generated/prisma/client'
import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requireProviderMarketplaceAccess } from '@/lib/marketplace/marketplace-authorization'
import { MarketplaceServiceError } from '@/lib/marketplace/marketplace-errors'
import { billingAddressSchema, WORKMATCHR_PRO_PLAN } from './financial-contract'
import { centsToMollieValue, createMollieGateway, getMollieUrls, type MollieGateway, type MolliePaymentSnapshot } from './mollie-gateway'
import { issueInvoiceForPaidSubscriptionPayment } from './invoice-service'
import { runSerializableFinancialTransaction } from './financial-transaction'

const inputSchema = z.object({
  actorUserId: z.string().uuid(),
  organizationId: z.string().uuid(),
  billingAddress: billingAddressSchema,
  idempotencyKey: z.string().trim().min(12).max(160).regex(/^[A-Za-z0-9:_-]+$/),
})

const cancellationInputSchema = z.object({
  actorUserId: z.string().uuid(),
  organizationId: z.string().uuid(),
})

async function lock(transaction: Prisma.TransactionClient, key: string) {
  await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`subscription:${key}`}, 0))::text AS "lock"`)
}

export async function createProSubscriptionCheckout(input: unknown, gateway: MollieGateway = createMollieGateway()) {
  const values = inputSchema.parse(input)
  const internal = await runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, values.organizationId)
    await requireProviderMarketplaceAccess(transaction, values.actorUserId, values.organizationId, true)
    const existing = await transaction.professionalSubscription.findUnique({
      where: { organizationId: values.organizationId },
      include: { firstPaymentPurchase: true, organization: { select: { name: true } } },
    })
    if (existing) return existing
    const purchase = await transaction.financialPurchase.create({
      data: {
        organizationId: values.organizationId,
        createdByUserId: values.actorUserId,
        kind: 'PRO_SUBSCRIPTION',
        packageSku: WORKMATCHR_PRO_PLAN.code,
        packageLabel: `${WORKMATCHR_PRO_PLAN.label} — eerste maand`,
        credits: 0,
        baseAmountCents: WORKMATCHR_PRO_PLAN.amountExclVatCents,
        amountExclVatCents: WORKMATCHR_PRO_PLAN.amountExclVatCents,
        vatRateBps: WORKMATCHR_PRO_PLAN.vatRateBps,
        vatAmountCents: WORKMATCHR_PRO_PLAN.vatAmountCents,
        amountInclVatCents: WORKMATCHR_PRO_PLAN.amountInclVatCents,
        currency: WORKMATCHR_PRO_PLAN.currency,
        billingOrganizationName: values.billingAddress.organizationName,
        billingAddressLine: values.billingAddress.addressLine,
        billingPostalCode: values.billingAddress.postalCode,
        billingCity: values.billingAddress.city,
        billingCountryCode: values.billingAddress.countryCode,
        billingKvKNumber: values.billingAddress.chamberOfCommerceNumber,
        billingVatId: values.billingAddress.vatId,
        idempotencyKey: `pro-purchase:${values.idempotencyKey}`,
      },
    })
    return transaction.professionalSubscription.create({
      data: {
        organizationId: values.organizationId,
        planCode: WORKMATCHR_PRO_PLAN.code,
        planLabel: WORKMATCHR_PRO_PLAN.label,
        amountExclVatCents: WORKMATCHR_PRO_PLAN.amountExclVatCents,
        vatRateBps: WORKMATCHR_PRO_PLAN.vatRateBps,
        vatAmountCents: WORKMATCHR_PRO_PLAN.vatAmountCents,
        amountInclVatCents: WORKMATCHR_PRO_PLAN.amountInclVatCents,
        currency: WORKMATCHR_PRO_PLAN.currency,
        firstPaymentPurchaseId: purchase.id,
      },
      include: { firstPaymentPurchase: true, organization: { select: { name: true } } },
    })
  })
  if (internal.firstPaymentPurchase?.mollieCheckoutUrl) return internal
  const actor = await getPrisma().user.findUniqueOrThrow({ where: { id: values.actorUserId }, select: { email: true } })
  const customer = internal.mollieCustomerId
    ? { id: internal.mollieCustomerId }
    : await gateway.createCustomer({
        name: internal.organization.name,
        email: actor.email,
        organizationId: values.organizationId,
        idempotencyKey: `mollie-customer-${values.organizationId}`,
      })
  const { webhookBaseUrl, redirectBaseUrl } = getMollieUrls()
  const purchase = internal.firstPaymentPurchase
  if (!purchase) throw new Error('PRO_PURCHASE_MISSING')
  const payment = await gateway.createPayment({
    amountValue: centsToMollieValue(purchase.amountInclVatCents),
    currency: 'EUR',
    description: `${WORKMATCHR_PRO_PLAN.label} eerste maand`,
    redirectUrl: new URL(`/credits/betaling/${purchase.id}`, redirectBaseUrl).toString(),
    webhookUrl: new URL('/api/payments/mollie/webhook', webhookBaseUrl).toString(),
    metadata: { purchaseId: purchase.id, organizationId: values.organizationId, subscriptionId: internal.id },
    idempotencyKey: `mollie-pro-first-${internal.id}`,
    customerId: customer.id,
    sequenceType: 'first',
  })
  if (!payment.checkoutUrl) throw new Error('MOLLIE_CHECKOUT_URL_MISSING')
  return runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, values.organizationId)
    await transaction.professionalSubscription.update({ where: { id: internal.id }, data: { mollieCustomerId: customer.id } })
    await transaction.financialPurchase.update({
      where: { id: purchase.id },
      data: { status: 'PAYMENT_PENDING', molliePaymentId: payment.id, mollieCheckoutUrl: payment.checkoutUrl, paymentCreatedAt: new Date() },
    })
    return transaction.professionalSubscription.findUniqueOrThrow({
      where: { id: internal.id }, include: { firstPaymentPurchase: true, organization: { select: { name: true } } },
    })
  })
}

export async function activateProAfterFirstPayment(subscriptionId: string, gateway: MollieGateway) {
  const subscription = await getPrisma().professionalSubscription.findUniqueOrThrow({ where: { id: subscriptionId } })
  if (subscription.status === 'ACTIVE' && subscription.mollieSubscriptionId) return subscription
  if (!subscription.mollieCustomerId) throw new Error('MOLLIE_CUSTOMER_MISSING')
  const { webhookBaseUrl } = getMollieUrls()
  const remote = await gateway.createSubscription({
    customerId: subscription.mollieCustomerId,
    amountValue: centsToMollieValue(subscription.amountInclVatCents),
    currency: 'EUR',
    interval: '1 month',
    description: subscription.planLabel,
    webhookUrl: new URL('/api/payments/mollie/webhook', webhookBaseUrl).toString(),
    idempotencyKey: `mollie-pro-subscription-${subscription.id}`,
    metadata: { subscriptionId: subscription.id, organizationId: subscription.organizationId },
  })
  return runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, subscription.organizationId)
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1)
    const updated = await transaction.professionalSubscription.update({
      where: { id: subscription.id },
      data: { status: 'ACTIVE', mollieSubscriptionId: remote.id, activatedAt: now, currentPeriodStart: now, currentPeriodEnd: periodEnd, pastDueAt: null, retryCount: 0 },
    })
    await transaction.financialEvent.upsert({
      where: { idempotencyKey: `pro-activated:${subscription.id}` },
      create: { subscriptionId: subscription.id, eventType: 'PRO_SUBSCRIPTION_ACTIVATED', result: 'SUCCEEDED', idempotencyKey: `pro-activated:${subscription.id}`, metadata: { mollieSubscriptionId: remote.id } },
      update: {},
    })
    return updated
  })
}

export async function processRecurringProPayment(payment: MolliePaymentSnapshot) {
  if (!payment.subscriptionId) throw new Error('MOLLIE_SUBSCRIPTION_ID_MISSING')
  const subscription = await getPrisma().professionalSubscription.findUnique({ where: { mollieSubscriptionId: payment.subscriptionId } })
  if (!subscription) throw new Error('UNKNOWN_MOLLIE_SUBSCRIPTION')
  if (payment.currency !== subscription.currency || payment.amountValue !== centsToMollieValue(subscription.amountInclVatCents)) throw new Error('MOLLIE_PAYMENT_MISMATCH')
  return runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, subscription.organizationId)
    const fingerprint = await import('node:crypto').then(({ createHash }) => createHash('sha256').update(JSON.stringify({ id: payment.id, status: payment.status, amount: payment.amountValue, currency: payment.currency, subscriptionId: payment.subscriptionId })).digest('hex'))
    const paymentRecord = await transaction.professionalSubscriptionPayment.upsert({
      where: { idempotencyKey: `pro-payment:${payment.id}:${payment.status}:${fingerprint}` },
      create: {
        subscriptionId: subscription.id,
        molliePaymentId: payment.id,
        status: payment.status === 'canceled' ? 'CANCELED' : payment.status.toUpperCase() as 'OPEN' | 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED',
        amountExclVatCents: subscription.amountExclVatCents,
        vatRateBps: subscription.vatRateBps,
        vatAmountCents: subscription.vatAmountCents,
        amountInclVatCents: subscription.amountInclVatCents,
        currency: subscription.currency,
        payloadFingerprint: fingerprint,
        idempotencyKey: `pro-payment:${payment.id}:${payment.status}:${fingerprint}`,
      },
      update: {},
    })
    if (payment.status === 'paid') {
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1)
      const updated = await transaction.professionalSubscription.update({ where: { id: subscription.id }, data: { status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: periodEnd, pastDueAt: null, retryCount: 0 } })
      await issueInvoiceForPaidSubscriptionPayment(transaction, paymentRecord.id, now)
      return updated
    }
    if (['failed', 'canceled', 'expired'].includes(payment.status)) {
      const now = new Date()
      const updated = await transaction.professionalSubscription.update({
        where: { id: subscription.id }, data: { status: 'PAST_DUE', pastDueAt: subscription.pastDueAt ?? now, retryCount: { increment: 1 } },
      })
      const recipients = await transaction.organizationMembership.findMany({ where: { organizationId: subscription.organizationId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, user: { status: 'ACTIVE' } }, select: { userId: true } })
      for (const recipient of recipients) {
        await transaction.marketplaceNotification.upsert({
          where: { recipientUserId_eventId: { recipientUserId: recipient.userId, eventId: `pro-payment-failed:${payment.id}` } },
          create: { recipientUserId: recipient.userId, eventId: `pro-payment-failed:${payment.id}`, type: 'PRO_PAYMENT_FAILED', title: 'Betaling WorkMatchr Pro niet gelukt', body: 'De Pro-voordelen zijn tijdelijk gepauzeerd. Uw overige WorkMatchr-functionaliteit en bestaande credits blijven beschikbaar.', targetRoute: '/credits', idempotencyKey: `${recipient.userId}:pro-payment-failed:${payment.id}` },
          update: {},
        })
      }
      return updated
    }
    return subscription
  })
}

export async function scheduleProCancellation(
  input: unknown,
  gateway: MollieGateway = createMollieGateway(),
) {
  const values = cancellationInputSchema.parse(input)
  const subscription = await runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, values.organizationId)
    await requireProviderMarketplaceAccess(transaction, values.actorUserId, values.organizationId, true)
    const current = await transaction.professionalSubscription.findUnique({
      where: { organizationId: values.organizationId },
    })
    if (!current) throw new MarketplaceServiceError('NOT_FOUND')
    if (current.cancelAtPeriodEnd) return current
    if (!['ACTIVE', 'PAST_DUE'].includes(current.status)) throw new MarketplaceServiceError('INVALID_STATE')
    if (!current.mollieCustomerId || !current.mollieSubscriptionId) throw new MarketplaceServiceError('INVALID_STATE')
    return current
  })

  if (subscription.cancelAtPeriodEnd) return subscription

  await gateway.cancelSubscription({
    customerId: subscription.mollieCustomerId!,
    subscriptionId: subscription.mollieSubscriptionId!,
    idempotencyKey: `mollie-pro-cancel:${subscription.id}`,
  })

  return runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, values.organizationId)
    await requireProviderMarketplaceAccess(transaction, values.actorUserId, values.organizationId, true)
    const current = await transaction.professionalSubscription.findUniqueOrThrow({
      where: { organizationId: values.organizationId },
    })
    if (current.cancelAtPeriodEnd) return current
    if (!['ACTIVE', 'PAST_DUE'].includes(current.status)) throw new MarketplaceServiceError('INVALID_STATE')

    const requestedAt = new Date()
    const effectiveAt = current.currentPeriodEnd && current.currentPeriodEnd > requestedAt
      ? current.currentPeriodEnd
      : requestedAt
    const updated = await transaction.professionalSubscription.update({
      where: { id: current.id },
      data: {
        cancelAtPeriodEnd: true,
        cancellationRequestedAt: requestedAt,
        cancellationEffectiveAt: effectiveAt,
      },
    })
    await transaction.financialEvent.upsert({
      where: { idempotencyKey: `pro-cancellation-scheduled:${current.id}` },
      create: {
        actorUserId: values.actorUserId,
        subscriptionId: current.id,
        eventType: 'PRO_SUBSCRIPTION_CANCELLATION_SCHEDULED',
        result: 'SUCCEEDED',
        idempotencyKey: `pro-cancellation-scheduled:${current.id}`,
        metadata: { effectiveAt: effectiveAt.toISOString(), statusAtRequest: current.status },
      },
      update: {},
    })
    return updated
  })
}

export async function finalizeScheduledProCancellations(at = new Date()) {
  const due = await getPrisma().professionalSubscription.findMany({
    where: {
      cancelAtPeriodEnd: true,
      cancellationEffectiveAt: { lte: at },
      status: { in: ['ACTIVE', 'PAST_DUE'] },
    },
    select: { id: true, organizationId: true },
  })
  let count = 0
  for (const item of due) {
    const finalized = await runSerializableFinancialTransaction(async (transaction) => {
      await lock(transaction, item.organizationId)
      const current = await transaction.professionalSubscription.findUniqueOrThrow({ where: { id: item.id } })
      if (!current.cancelAtPeriodEnd || !current.cancellationEffectiveAt || current.cancellationEffectiveAt > at) return false
      if (!['ACTIVE', 'PAST_DUE'].includes(current.status)) return false
      await transaction.professionalSubscription.update({
        where: { id: current.id },
        data: { status: 'CANCELED', cancelAtPeriodEnd: false, cancellationRequestedAt: null, cancellationEffectiveAt: null, canceledAt: at },
      })
      await transaction.financialEvent.upsert({
        where: { idempotencyKey: `pro-canceled-at-period-end:${current.id}` },
        create: {
          subscriptionId: current.id,
          eventType: 'PRO_SUBSCRIPTION_CANCELED_AT_PERIOD_END',
          result: 'SUCCEEDED',
          idempotencyKey: `pro-canceled-at-period-end:${current.id}`,
          metadata: { canceledAt: at.toISOString() },
        },
        update: {},
      })
      return true
    })
    if (finalized) count += 1
  }
  return { count }
}

export async function suspendOverdueProSubscriptions(at = new Date()) {
  const threshold = new Date(at)
  threshold.setUTCMonth(threshold.getUTCMonth() - 1)
  const due = await getPrisma().professionalSubscription.findMany({
    where: { status: 'PAST_DUE', cancelAtPeriodEnd: false, pastDueAt: { lte: threshold } },
    select: { id: true, organizationId: true },
  })
  let count = 0
  for (const item of due) {
    const suspended = await runSerializableFinancialTransaction(async (transaction) => {
      await lock(transaction, item.organizationId)
      const current = await transaction.professionalSubscription.findUniqueOrThrow({ where: { id: item.id } })
      if (current.status !== 'PAST_DUE' || current.cancelAtPeriodEnd || !current.pastDueAt || current.pastDueAt > threshold) return false
      await transaction.professionalSubscription.update({
        where: { id: current.id },
        data: { status: 'SUSPENDED', suspendedAt: at },
      })
      await transaction.financialEvent.upsert({
        where: { idempotencyKey: `pro-suspended-overdue:${current.id}` },
        create: {
          subscriptionId: current.id,
          eventType: 'PRO_SUBSCRIPTION_SUSPENDED_OVERDUE',
          result: 'SUCCEEDED',
          idempotencyKey: `pro-suspended-overdue:${current.id}`,
          metadata: { pastDueAt: current.pastDueAt.toISOString(), suspendedAt: at.toISOString() },
        },
        update: {},
      })
      return true
    })
    if (suspended) count += 1
  }
  return { count }
}
