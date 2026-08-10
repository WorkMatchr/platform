import 'server-only'

import { Prisma } from '@/generated/prisma/client'
import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requireProviderMarketplaceAccess } from '@/lib/marketplace/marketplace-authorization'
import { MarketplaceServiceError } from '@/lib/marketplace/marketplace-errors'
import { billingAddressSchema, WORKMATCHR_PRO_PLAN } from './financial-contract'
import {
  centsToMollieValue,
  createMollieGateway,
  getMollieUrls,
  MollieUrlConfigurationError,
  type MollieGateway,
  type MollieFirstPaymentMethod,
  type MollieMandateMethod,
  type MollieMandateSnapshot,
  type MolliePaymentSnapshot,
  type MollieSubscriptionSnapshot,
} from './mollie-gateway'
import { issueInvoiceForPaidSubscriptionPayment } from './invoice-service'
import { runSerializableFinancialTransaction } from './financial-transaction'
import { isRetryableProFirstPaymentAttempt } from './pro-subscription-presentation'

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

function addUtcMonth(value: Date) {
  const result = new Date(value)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + 1)
  const lastDayOfTargetMonth = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDayOfTargetMonth))
  return result
}

function toMollieDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

type ValidRecurringMandate = MollieMandateSnapshot & Readonly<{
  status: 'valid'
  method: MollieMandateMethod
}>

function isValidRecurringMandate(mandate: MollieMandateSnapshot): mandate is ValidRecurringMandate {
  return mandate.status === 'valid' && ['directdebit', 'creditcard'].includes(mandate.method)
}

function selectValidRecurringMandate(mandates: readonly MollieMandateSnapshot[]) {
  const valid = mandates.filter(isValidRecurringMandate)
  return valid.find((mandate) => mandate.method === 'directdebit')
    ?? valid.find((mandate) => mandate.method === 'creditcard')
    ?? null
}

function assertMatchingRemoteSubscription(
  remote: MollieSubscriptionSnapshot,
  subscription: {
    id: string
    organizationId: string
    amountInclVatCents: number
    currency: string
  },
  mandate: { id: string; method: MollieMandateMethod },
) {
  if (
    remote.metadata.subscriptionId !== subscription.id
    || remote.metadata.organizationId !== subscription.organizationId
    || remote.amountValue !== centsToMollieValue(subscription.amountInclVatCents)
    || remote.currency !== subscription.currency
    || remote.interval !== '1 month'
    || remote.mandateId !== mandate.id
    || remote.method !== mandate.method
    || !['pending', 'active'].includes(remote.status)
  ) throw new Error('MOLLIE_SUBSCRIPTION_MISMATCH')
}

function isActiveOrMandatedSubscription(subscription: {
  status: string
  mollieSubscriptionId: string | null
  mollieMandateId: string | null
}) {
  return subscription.status === 'ACTIVE' || subscription.mollieSubscriptionId !== null || subscription.mollieMandateId !== null
}

type ProFirstPaymentDiagnosticCategory =
  | 'MOLLIE_CUSTOMER_CREATE_FAILED'
  | 'MOLLIE_CUSTOMER_REUSE_FAILED'
  | 'MOLLIE_CUSTOMER_INVALID'
  | 'MOLLIE_PAYMENT_CREATE_FAILED'
  | 'MOLLIE_PAYMENT_REJECTED'
  | 'MOLLIE_METHOD_UNAVAILABLE'
  | 'MOLLIE_REDIRECT_URL_INVALID'
  | 'MOLLIE_WEBHOOK_URL_INVALID'

function logProFirstPaymentDiagnostic(category: ProFirstPaymentDiagnosticCategory, step: string, context: { subscriptionId: string; purchaseId: string }, error?: unknown) {
  const candidate = error as { statusCode?: unknown; status?: unknown; code?: unknown; type?: unknown } | undefined
  console.error('pro_first_payment_failure', {
    category,
    step,
    subscriptionId: context.subscriptionId,
    purchaseId: context.purchaseId,
    httpStatus: typeof candidate?.statusCode === 'number' ? candidate.statusCode : typeof candidate?.status === 'number' ? candidate.status : undefined,
    mollieErrorCode: typeof candidate?.code === 'string' ? candidate.code : undefined,
    mollieErrorType: typeof candidate?.type === 'string' ? candidate.type : undefined,
  })
}

function categoryForPaymentCreateFailure(subscription: { mollieCustomerId: string | null }, error: unknown): ProFirstPaymentDiagnosticCategory {
  const candidate = error as { statusCode?: unknown; status?: unknown } | undefined
  const httpStatus = typeof candidate?.statusCode === 'number'
    ? candidate.statusCode
    : typeof candidate?.status === 'number'
      ? candidate.status
      : undefined

  if (subscription.mollieCustomerId && httpStatus === 404) return 'MOLLIE_CUSTOMER_INVALID'
  if (httpStatus === 400 || httpStatus === 422) return 'MOLLIE_PAYMENT_REJECTED'
  return 'MOLLIE_PAYMENT_CREATE_FAILED'
}

async function markUnstartedProFirstPaymentAsFailed(input: {
  organizationId: string
  actorUserId: string
  subscriptionId: string
  purchaseId: string
  category: ProFirstPaymentDiagnosticCategory
}) {
  await runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, input.organizationId)
    const purchase = await transaction.financialPurchase.findUniqueOrThrow({ where: { id: input.purchaseId } })
    if (purchase.status !== 'CREATED' || purchase.molliePaymentId !== null || purchase.mollieCheckoutUrl !== null) return

    const terminalAt = new Date()
    await transaction.financialPurchase.update({
      where: { id: purchase.id },
      data: { status: 'FAILED', terminalAt },
    })
    await transaction.financialEvent.upsert({
      where: { idempotencyKey: `pro-first-payment-start-failed:${purchase.id}` },
      create: {
        actorUserId: input.actorUserId,
        subscriptionId: input.subscriptionId,
        purchaseId: purchase.id,
        eventType: 'PRO_FIRST_PAYMENT_START_FAILED',
        result: 'REJECTED',
        reason: input.category,
        idempotencyKey: `pro-first-payment-start-failed:${purchase.id}`,
        metadata: { category: input.category, externalPaymentCreated: false },
      },
      update: {},
    })
  })
}

export async function createProSubscriptionCheckout(input: unknown, gateway: MollieGateway = createMollieGateway()) {
  const values = inputSchema.parse(input)
  const internal = await runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, values.organizationId)
    await requireProviderMarketplaceAccess(transaction, values.actorUserId, values.organizationId, true)
    const existing = await transaction.professionalSubscription.findUnique({
      where: { organizationId: values.organizationId },
      include: {
        firstPaymentPurchase: true,
        firstPaymentAttempts: { orderBy: { attemptNumber: 'desc' }, take: 1, include: { purchase: true } },
        organization: { select: { name: true } },
      },
    })
    if (existing) {
      if (isActiveOrMandatedSubscription(existing)) throw new MarketplaceServiceError('INVALID_STATE')
      const latestPurchase = existing.firstPaymentAttempts[0]?.purchase ?? existing.firstPaymentPurchase
      if (!latestPurchase) throw new MarketplaceServiceError('CONFLICT')
      if (!isRetryableProFirstPaymentAttempt(latestPurchase)) return { subscription: existing, purchase: latestPurchase }
      if (latestPurchase.status === 'CREATED') {
        const terminalAt = new Date()
        await transaction.financialPurchase.update({
          where: { id: latestPurchase.id },
          data: { status: 'FAILED', terminalAt },
        })
        await transaction.financialEvent.upsert({
          where: { idempotencyKey: `pro-first-payment-start-failed:${latestPurchase.id}` },
          create: {
            actorUserId: values.actorUserId,
            subscriptionId: existing.id,
            purchaseId: latestPurchase.id,
            eventType: 'PRO_FIRST_PAYMENT_START_FAILED',
            result: 'REJECTED',
            reason: 'MOLLIE_PAYMENT_CREATE_FAILED',
            idempotencyKey: `pro-first-payment-start-failed:${latestPurchase.id}`,
            metadata: { category: 'MOLLIE_PAYMENT_CREATE_FAILED', externalPaymentCreated: false },
          },
          update: {},
        })
      }

      const attemptNumber = (existing.firstPaymentAttempts[0]?.attemptNumber ?? 0) + 1
      const purchase = await transaction.financialPurchase.create({
        data: {
          organizationId: values.organizationId,
          createdByUserId: values.actorUserId,
          kind: 'PRO_SUBSCRIPTION',
          packageSku: existing.planCode,
          packageLabel: `${existing.planLabel} — eerste maand`,
          credits: 0,
          baseAmountCents: existing.amountExclVatCents,
          amountExclVatCents: existing.amountExclVatCents,
          vatRateBps: existing.vatRateBps,
          vatAmountCents: existing.vatAmountCents,
          amountInclVatCents: existing.amountInclVatCents,
          currency: existing.currency,
          billingOrganizationName: values.billingAddress.organizationName,
          billingAddressLine: values.billingAddress.addressLine,
          billingPostalCode: values.billingAddress.postalCode,
          billingCity: values.billingAddress.city,
          billingCountryCode: values.billingAddress.countryCode,
          billingKvKNumber: values.billingAddress.chamberOfCommerceNumber,
          billingVatId: values.billingAddress.vatId,
          idempotencyKey: `pro-purchase-retry:${existing.id}:${attemptNumber}`,
        },
      })
      await transaction.professionalSubscriptionFirstPaymentAttempt.create({
        data: { subscriptionId: existing.id, purchaseId: purchase.id, attemptNumber },
      })
      await transaction.financialEvent.create({
        data: {
          actorUserId: values.actorUserId,
          subscriptionId: existing.id,
          purchaseId: purchase.id,
          eventType: 'PRO_FIRST_PAYMENT_RETRY_STARTED',
          result: 'SUCCEEDED',
          idempotencyKey: `pro-first-payment-retry:${existing.id}:${attemptNumber}`,
          metadata: { attemptNumber, replacesPurchaseId: latestPurchase.id },
        },
      })
      return { subscription: existing, purchase }
    }
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
    const subscription = await transaction.professionalSubscription.create({
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
    return { subscription, purchase }
  })
  if (internal.purchase.mollieCheckoutUrl) return { subscription: internal.subscription, checkoutUrl: internal.purchase.mollieCheckoutUrl }
  if (internal.purchase.status === 'PAYMENT_PENDING' || internal.purchase.molliePaymentId) throw new MarketplaceServiceError('CONFLICT')
  const actor = await getPrisma().user.findUniqueOrThrow({ where: { id: values.actorUserId }, select: { email: true } })
  let customer: { id: string }
  try {
    customer = internal.subscription.mollieCustomerId
      ? { id: internal.subscription.mollieCustomerId }
      : await gateway.createCustomer({
        name: internal.subscription.organization.name,
        email: actor.email,
        organizationId: values.organizationId,
        idempotencyKey: `mollie-customer-${values.organizationId}`,
      })
  } catch (error) {
    const category = internal.subscription.mollieCustomerId ? 'MOLLIE_CUSTOMER_REUSE_FAILED' : 'MOLLIE_CUSTOMER_CREATE_FAILED'
    logProFirstPaymentDiagnostic(category, 'customer', { subscriptionId: internal.subscription.id, purchaseId: internal.purchase.id }, error)
    await markUnstartedProFirstPaymentAsFailed({ organizationId: values.organizationId, actorUserId: values.actorUserId, subscriptionId: internal.subscription.id, purchaseId: internal.purchase.id, category })
    throw error
  }
  if (!internal.subscription.mollieCustomerId) {
    await runSerializableFinancialTransaction(async (transaction) => {
      await lock(transaction, values.organizationId)
      await transaction.professionalSubscription.update({
        where: { id: internal.subscription.id },
        data: { mollieCustomerId: customer.id },
      })
    })
  }
  let webhookBaseUrl: string
  let redirectBaseUrl: string
  try {
    ({ webhookBaseUrl, redirectBaseUrl } = getMollieUrls())
  } catch (error) {
    const category =
      error instanceof MollieUrlConfigurationError && error.field === 'webhook'
        ? 'MOLLIE_WEBHOOK_URL_INVALID'
        : 'MOLLIE_REDIRECT_URL_INVALID'
    logProFirstPaymentDiagnostic(category, 'redirect_and_webhook_url_configuration', { subscriptionId: internal.subscription.id, purchaseId: internal.purchase.id }, error)
    await markUnstartedProFirstPaymentAsFailed({ organizationId: values.organizationId, actorUserId: values.actorUserId, subscriptionId: internal.subscription.id, purchaseId: internal.purchase.id, category })
    throw error
  }
  const purchase = internal.purchase
  let providerMethods: readonly MollieFirstPaymentMethod[]
  try {
    providerMethods = await gateway.listFirstPaymentMethods(centsToMollieValue(purchase.amountInclVatCents))
  } catch (error) {
    const category = 'MOLLIE_METHOD_UNAVAILABLE'
    logProFirstPaymentDiagnostic(category, 'first_payment_methods', { subscriptionId: internal.subscription.id, purchaseId: purchase.id }, error)
    await markUnstartedProFirstPaymentAsFailed({ organizationId: values.organizationId, actorUserId: values.actorUserId, subscriptionId: internal.subscription.id, purchaseId: purchase.id, category })
    throw error
  }
  const methods = (['ideal', 'creditcard'] as const).filter((method): method is MollieFirstPaymentMethod => (
    providerMethods.includes(method)
  ))
  if (methods.length === 0) {
    const category = 'MOLLIE_METHOD_UNAVAILABLE'
    logProFirstPaymentDiagnostic(category, 'first_payment_methods', { subscriptionId: internal.subscription.id, purchaseId: purchase.id })
    await markUnstartedProFirstPaymentAsFailed({ organizationId: values.organizationId, actorUserId: values.actorUserId, subscriptionId: internal.subscription.id, purchaseId: purchase.id, category })
    throw new Error('MOLLIE_PRO_FIRST_PAYMENT_METHOD_UNAVAILABLE')
  }
  let payment: MolliePaymentSnapshot
  try {
    payment = await gateway.createPayment({
    amountValue: centsToMollieValue(purchase.amountInclVatCents),
    currency: 'EUR',
    description: `${WORKMATCHR_PRO_PLAN.label} eerste maand`,
    redirectUrl: new URL(`/credits/betaling/${purchase.id}`, redirectBaseUrl).toString(),
    webhookUrl: new URL('/api/payments/mollie/webhook', webhookBaseUrl).toString(),
    metadata: { purchaseId: purchase.id, organizationId: values.organizationId, subscriptionId: internal.subscription.id },
    idempotencyKey: `mollie-pro-first-${purchase.id}`,
    customerId: customer.id,
    sequenceType: 'first',
    methods,
    })
  } catch (error) {
    const category = categoryForPaymentCreateFailure(internal.subscription, error)
    logProFirstPaymentDiagnostic(category, 'payment_create', { subscriptionId: internal.subscription.id, purchaseId: purchase.id }, error)
    await markUnstartedProFirstPaymentAsFailed({ organizationId: values.organizationId, actorUserId: values.actorUserId, subscriptionId: internal.subscription.id, purchaseId: purchase.id, category })
    throw error
  }
  if (!payment.checkoutUrl) {
    const category = 'MOLLIE_PAYMENT_CREATE_FAILED'
    logProFirstPaymentDiagnostic(category, 'payment_checkout_url', { subscriptionId: internal.subscription.id, purchaseId: purchase.id })
    await markUnstartedProFirstPaymentAsFailed({ organizationId: values.organizationId, actorUserId: values.actorUserId, subscriptionId: internal.subscription.id, purchaseId: purchase.id, category })
    throw new Error('MOLLIE_CHECKOUT_URL_MISSING')
  }
  return runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, values.organizationId)
    await transaction.professionalSubscription.update({ where: { id: internal.subscription.id }, data: { mollieCustomerId: customer.id } })
    await transaction.financialPurchase.update({
      where: { id: purchase.id },
      data: { status: 'PAYMENT_PENDING', molliePaymentId: payment.id, mollieCheckoutUrl: payment.checkoutUrl, paymentCreatedAt: new Date() },
    })
    return { subscription: await transaction.professionalSubscription.findUniqueOrThrow({ where: { id: internal.subscription.id } }), checkoutUrl: payment.checkoutUrl }
  })
}

export async function activateProAfterFirstPayment(subscriptionId: string, gateway: MollieGateway, paymentPurchaseId?: string) {
  const subscription = await getPrisma().professionalSubscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { firstPaymentPurchase: { select: { paidAt: true, status: true } } },
  })
  if (subscription.status === 'ACTIVE' && subscription.mollieSubscriptionId) return subscription
  if (!subscription.mollieCustomerId) throw new Error('MOLLIE_CUSTOMER_MISSING')
  const paymentPurchase = paymentPurchaseId
    ? await getPrisma().financialPurchase.findUnique({ where: { id: paymentPurchaseId }, select: { paidAt: true, status: true } })
    : subscription.firstPaymentPurchase
  if (paymentPurchase?.status !== 'PAID') throw new Error('PRO_FIRST_PAYMENT_NOT_PAID')
  const mandates = await gateway.listCustomerMandates(subscription.mollieCustomerId)
  const mandate = selectValidRecurringMandate(mandates)
  if (!mandate) {
    await getPrisma().financialEvent.upsert({
      where: { idempotencyKey: `pro-mandate-missing:${subscription.id}` },
      create: {
        subscriptionId: subscription.id,
        eventType: 'PRO_MANDATE_VALIDATION_FAILED',
        result: 'REJECTED',
        reason: 'Mollie heeft nog geen geldig mandaat voor terugkerende betalingen bevestigd.',
        idempotencyKey: `pro-mandate-missing:${subscription.id}`,
        metadata: { validMandateFound: false },
      },
      update: {},
    })
    throw new Error('MOLLIE_VALID_MANDATE_MISSING')
  }
  const verifiedAt = new Date()
  await runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, subscription.organizationId)
    await transaction.professionalSubscription.update({
      where: { id: subscription.id },
      data: {
        mollieMandateId: mandate.id,
        mollieMandateStatus: mandate.status,
        mollieMandateMethod: mandate.method,
        mollieMandateVerifiedAt: verifiedAt,
      },
    })
    await transaction.financialEvent.upsert({
      where: { idempotencyKey: `pro-mandate-activated:${subscription.id}:${mandate.id}` },
      create: {
        subscriptionId: subscription.id,
        eventType: 'PRO_MANDATE_ACTIVATED',
        result: 'SUCCEEDED',
        idempotencyKey: `pro-mandate-activated:${subscription.id}:${mandate.id}`,
        metadata: { mollieMandateId: mandate.id, status: mandate.status, method: mandate.method },
      },
      update: {},
    })
  })
  const { webhookBaseUrl } = getMollieUrls()
  const periodStart = paymentPurchase.paidAt ?? verifiedAt
  const periodEnd = addUtcMonth(periodStart)
  const existingRemote = await gateway.findCustomerSubscription(subscription.mollieCustomerId, subscription.id)
  const remote = existingRemote ?? await gateway.createSubscription({
    customerId: subscription.mollieCustomerId,
    amountValue: centsToMollieValue(subscription.amountInclVatCents),
    currency: 'EUR',
    interval: '1 month',
    description: `${subscription.planLabel} maandabonnement`,
    webhookUrl: new URL('/api/payments/mollie/webhook', webhookBaseUrl).toString(),
    mandateId: mandate.id,
    method: mandate.method,
    startDate: toMollieDate(periodEnd),
    idempotencyKey: `mollie-pro-subscription-${subscription.id}`,
    metadata: { subscriptionId: subscription.id, organizationId: subscription.organizationId },
  })
  assertMatchingRemoteSubscription(remote, subscription, mandate)
  return runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, subscription.organizationId)
    const current = await transaction.professionalSubscription.findUniqueOrThrow({ where: { id: subscription.id } })
    if (current.status === 'ACTIVE' && current.mollieSubscriptionId) return current
    const updated = await transaction.professionalSubscription.update({
      where: { id: subscription.id },
      data: { status: 'ACTIVE', mollieSubscriptionId: remote.id, activatedAt: verifiedAt, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, pastDueAt: null, retryCount: 0 },
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
  if (subscription.mollieMandateId && payment.mandateId !== subscription.mollieMandateId) throw new Error('MOLLIE_MANDATE_MISMATCH')
  if (subscription.mollieMandateMethod && payment.method !== subscription.mollieMandateMethod) throw new Error('MOLLIE_MANDATE_METHOD_MISMATCH')
  return runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, subscription.organizationId)
    const fingerprint = await import('node:crypto').then(({ createHash }) => createHash('sha256').update(JSON.stringify({ id: payment.id, status: payment.status, amount: payment.amountValue, currency: payment.currency, subscriptionId: payment.subscriptionId, mandateId: payment.mandateId, method: payment.method })).digest('hex'))
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
