import 'server-only'

import createMollieClient, { PaymentMethod, SequenceType } from '@mollie/api-client'
import { z } from 'zod'

export type MolliePaymentState =
  | 'open'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'canceled'
  | 'expired'

export type MolliePaymentSnapshot = Readonly<{
  id: string
  status: MolliePaymentState
  amountValue: string
  currency: string
  metadata: Readonly<{ purchaseId?: string; organizationId?: string; subscriptionId?: string }>
  paidAt: string | null
  createdAt: string | null
  checkoutUrl: string | null
  subscriptionId: string | null
  mandateId: string | null
  method: string | null
}>

export type MollieFirstPaymentMethod = 'ideal' | 'creditcard'
export type MollieMandateMethod = 'directdebit' | 'creditcard'
export type MollieMandateSnapshot = Readonly<{
  id: string
  status: 'valid' | 'pending' | 'invalid'
  method: MollieMandateMethod | 'paypal'
}>

export type MollieSubscriptionSnapshot = Readonly<{
  id: string
  status: string
  amountValue: string
  currency: string
  interval: string
  mandateId: string | null
  method: string | null
  metadata: Readonly<{ subscriptionId?: string; organizationId?: string }>
}>

export type MollieRefundState = 'queued' | 'pending' | 'processing' | 'refunded' | 'failed' | 'canceled'

export type MollieRefundSnapshot = Readonly<{
  id: string
  status: MollieRefundState
}>

export interface MollieGateway {
  createPayment(input: {
    amountValue: string
    currency: 'EUR'
    description: string
    redirectUrl: string
    webhookUrl: string
    metadata: { purchaseId: string; organizationId: string; subscriptionId?: string }
    idempotencyKey: string
    customerId?: string
    sequenceType?: 'oneoff' | 'first' | 'recurring'
    methods?: readonly MollieFirstPaymentMethod[]
  }): Promise<MolliePaymentSnapshot>
  getPayment(paymentId: string): Promise<MolliePaymentSnapshot>
  createRefund(input: {
    paymentId: string
    amountValue: string
    currency: 'EUR'
    description: string
    idempotencyKey: string
    metadata: { refundId: string; purchaseId: string }
  }): Promise<MollieRefundSnapshot>
  getRefund(input: { paymentId: string; refundId: string }): Promise<MollieRefundSnapshot>
  createCustomer(input: { name: string; email: string; organizationId: string; idempotencyKey: string }): Promise<{ id: string }>
  listFirstPaymentMethods(amountValue: string): Promise<readonly MollieFirstPaymentMethod[]>
  listCustomerMandates(customerId: string): Promise<readonly MollieMandateSnapshot[]>
  createSubscription(input: {
    customerId: string
    amountValue: string
    currency: 'EUR'
    interval: '1 month'
    description: string
    webhookUrl: string
    mandateId: string
    method: MollieMandateMethod
    startDate: string
    idempotencyKey: string
    metadata: { subscriptionId: string; organizationId: string }
  }): Promise<MollieSubscriptionSnapshot>
  findCustomerSubscription(
    customerId: string,
    internalSubscriptionId: string,
  ): Promise<MollieSubscriptionSnapshot | null>
  cancelSubscription(input: {
    customerId: string
    subscriptionId: string
    idempotencyKey: string
  }): Promise<{ id: string; status: string }>
}

export class MollieUrlConfigurationError extends Error {
  readonly field: 'webhook' | 'redirect'

  constructor(field: 'webhook' | 'redirect') {
    super(`MOLLIE_${field.toUpperCase()}_URL_INVALID`)
    this.name = 'MollieUrlConfigurationError'
    this.field = field
  }
}

const safeMetadataSchema = z.object({
  purchaseId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
}).passthrough()

function subscriptionSnapshot(subscription: {
  id: string
  status: string
  amount: { value: string; currency: string }
  interval: string
  mandateId?: string | null
  method?: string | null
  metadata?: unknown
}): MollieSubscriptionSnapshot {
  const metadata = safeMetadataSchema.safeParse(subscription.metadata)
  return Object.freeze({
    id: subscription.id,
    status: subscription.status,
    amountValue: subscription.amount.value,
    currency: subscription.amount.currency,
    interval: subscription.interval,
    mandateId: subscription.mandateId ?? null,
    method: subscription.method ?? null,
    metadata: metadata.success ? metadata.data : {},
  })
}

function paymentSnapshot(payment: {
  id: string
  status: string
  amount: { value: string; currency: string }
  metadata?: unknown
  paidAt?: string | null
  createdAt?: string | null
  subscriptionId?: string | null
  mandateId?: string | null
  method?: string | null
  getCheckoutUrl(): string | null
}): MolliePaymentSnapshot {
  const status = z.enum(['open', 'pending', 'paid', 'failed', 'canceled', 'expired']).parse(payment.status)
  const metadata = safeMetadataSchema.safeParse(payment.metadata)
  return Object.freeze({
    id: payment.id,
    status,
    amountValue: payment.amount.value,
    currency: payment.amount.currency,
    metadata: metadata.success ? metadata.data : {},
    paidAt: payment.paidAt ?? null,
    createdAt: payment.createdAt ?? null,
    checkoutUrl: payment.getCheckoutUrl(),
    subscriptionId: payment.subscriptionId ?? null,
    mandateId: payment.mandateId ?? null,
    method: payment.method ?? null,
  })
}

function parseMollieBaseUrl(value: string | undefined, field: 'webhook' | 'redirect') {
  const parsed = z.string().url().safeParse(value)
  if (!parsed.success) throw new MollieUrlConfigurationError(field)
  return parsed.data
}

function requireMollieConfiguration() {
  const apiKey = process.env.MOLLIE_API_KEY?.trim()
  if (!apiKey) throw new Error('MOLLIE_CONFIGURATION_MISSING')
  return {
    client: createMollieClient({ apiKey }),
    webhookBaseUrl: parseMollieBaseUrl(process.env.MOLLIE_WEBHOOK_BASE_URL, 'webhook'),
    redirectBaseUrl: parseMollieBaseUrl(process.env.MOLLIE_REDIRECT_BASE_URL, 'redirect'),
  }
}

export function getMollieUrls() {
  const { webhookBaseUrl, redirectBaseUrl } = requireMollieConfiguration()
  return { webhookBaseUrl, redirectBaseUrl }
}

export function createMollieGateway(): MollieGateway {
  const { client } = requireMollieConfiguration()
  return {
    async createPayment(input) {
      const payment = await client.payments.create({
        amount: { value: input.amountValue, currency: input.currency },
        description: input.description,
        redirectUrl: input.redirectUrl,
        webhookUrl: input.webhookUrl,
        metadata: input.metadata,
        customerId: input.customerId,
        sequenceType: input.sequenceType === 'first'
          ? SequenceType.first
          : input.sequenceType === 'recurring'
            ? SequenceType.recurring
            : SequenceType.oneoff,
        method: input.methods?.map((method) => method === 'ideal' ? PaymentMethod.ideal : PaymentMethod.creditcard),
        idempotencyKey: input.idempotencyKey,
      })
      return paymentSnapshot(payment)
    },
    async getPayment(paymentId) {
      return paymentSnapshot(await client.payments.get(paymentId))
    },
    async createRefund(input) {
      const refund = await client.paymentRefunds.create({
        paymentId: input.paymentId,
        amount: { value: input.amountValue, currency: input.currency },
        description: input.description,
        metadata: input.metadata,
        idempotencyKey: input.idempotencyKey,
      })
      return { id: refund.id, status: refund.status }
    },
    async getRefund(input) {
      const refund = await client.paymentRefunds.get(input.refundId, { paymentId: input.paymentId })
      return { id: refund.id, status: refund.status }
    },
    async createCustomer(input) {
      const customer = await client.customers.create({
        name: input.name,
        email: input.email,
        metadata: { organizationId: input.organizationId },
        idempotencyKey: input.idempotencyKey,
      })
      return { id: customer.id }
    },
    async listFirstPaymentMethods(amountValue) {
      const methods = await client.methods.list({
        sequenceType: SequenceType.first,
        amount: { value: amountValue, currency: 'EUR' },
      })
      return methods
        .map((method) => method.id)
        .filter((method): method is PaymentMethod.ideal | PaymentMethod.creditcard => (
          method === PaymentMethod.ideal || method === PaymentMethod.creditcard
        ))
    },
    async listCustomerMandates(customerId) {
      const mandates = await client.customerMandates.page({ customerId })
      return mandates.map((mandate) => Object.freeze({
        id: mandate.id,
        status: mandate.status,
        method: mandate.method,
      }))
    },
    async createSubscription(input) {
      const subscription = await client.customerSubscriptions.create({
        customerId: input.customerId,
        amount: { value: input.amountValue, currency: input.currency },
        interval: input.interval,
        description: input.description,
        mandateId: input.mandateId,
        method: input.method,
        startDate: input.startDate,
        webhookUrl: input.webhookUrl,
        metadata: input.metadata,
        idempotencyKey: input.idempotencyKey,
      })
      return subscriptionSnapshot(subscription)
    },
    async findCustomerSubscription(customerId, internalSubscriptionId) {
      for await (const subscription of client.customerSubscriptions.iterate({ customerId })) {
        const snapshot = subscriptionSnapshot(subscription)
        if (snapshot.metadata.subscriptionId === internalSubscriptionId) return snapshot
      }
      return null
    },
    async cancelSubscription(input) {
      const subscription = await client.customerSubscriptions.cancel(input.subscriptionId, {
        customerId: input.customerId,
        idempotencyKey: input.idempotencyKey,
      })
      return { id: subscription.id, status: subscription.status }
    },
  }
}

export function centsToMollieValue(cents: number) {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('INVALID_MONEY_AMOUNT')
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

export function mollieValueToCents(value: string) {
  const match = /^(\d+)\.(\d{2})$/.exec(value)
  if (!match) throw new Error('INVALID_MOLLIE_AMOUNT')
  const cents = Number(match[1]) * 100 + Number(match[2])
  if (!Number.isSafeInteger(cents)) throw new Error('INVALID_MOLLIE_AMOUNT')
  return cents
}
