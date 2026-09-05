import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MollieGateway, MolliePaymentSnapshot, MollieSubscriptionSnapshot } from './mollie-gateway'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  createCustomer: vi.fn(),
  createPayment: vi.fn(),
  createSubscription: vi.fn(),
  eventCount: vi.fn(),
  eventCreate: vi.fn(),
  eventUpsert: vi.fn(),
  findRemoteSubscription: vi.fn(),
  invoice: vi.fn(),
  listMandates: vi.fn(),
  listFirstPaymentMethods: vi.fn(),
  paymentUpsert: vi.fn(),
  firstPaymentAttemptCreate: vi.fn(),
}))

const subscriptionId = '30000000-0000-4000-8000-000000000001'
const organizationId = '20000000-0000-4000-8000-000000000001'
const actorUserId = '10000000-0000-4000-8000-000000000001'
const purchaseId = '40000000-0000-4000-8000-000000000001'

let current: Record<string, unknown>
let purchase: Record<string, unknown>

const transaction = {
  $queryRaw: vi.fn(),
  financialPurchase: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      purchase = { id: purchaseId, ...data, status: 'CREATED', molliePaymentId: null, mollieCheckoutUrl: null }
      return purchase
    }),
    findUniqueOrThrow: vi.fn(async () => ({ ...purchase })),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      purchase = { ...purchase, ...data }
      return purchase
    }),
  },
  professionalSubscription: {
    findUnique: vi.fn(async () => current ? { ...current } : null),
    findUniqueOrThrow: vi.fn(async () => ({ ...current })),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      current = {
        id: subscriptionId,
        ...data,
        status: 'PENDING_MANDATE',
        mollieCustomerId: null,
        mollieSubscriptionId: null,
        firstPaymentPurchase: purchase,
        organization: { name: 'Testprofessional' },
      }
      return { ...current }
    }),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const retryCount = typeof data.retryCount === 'object' && data.retryCount && 'increment' in data.retryCount
        ? Number(current.retryCount ?? 0) + Number(data.retryCount.increment)
        : data.retryCount
      current = { ...current, ...data, ...(retryCount === undefined ? {} : { retryCount }) }
      return { ...current }
    }),
  },
  professionalSubscriptionFirstPaymentAttempt: {
    create: mocks.firstPaymentAttemptCreate,
  },
  professionalSubscriptionPayment: { upsert: mocks.paymentUpsert },
  financialEvent: { upsert: mocks.eventUpsert, create: mocks.eventCreate, count: mocks.eventCount },
  organizationMembership: { findMany: vi.fn(async () => []) },
  marketplaceNotification: { upsert: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    user: { findUniqueOrThrow: vi.fn(async () => ({ email: 'professional@example.invalid' })) },
    professionalSubscription: {
      findUnique: vi.fn(async () => current ? { ...current } : null),
      findUniqueOrThrow: vi.fn(async () => ({ ...current })),
    },
    financialEvent: { upsert: mocks.eventUpsert },
  }),
}))
vi.mock('@/lib/marketplace/marketplace-authorization', () => ({
  requireProviderMarketplaceAccess: mocks.authorize,
}))
vi.mock('./financial-transaction', () => ({
  runSerializableFinancialTransaction: (operation: (value: typeof transaction) => unknown) => operation(transaction),
}))
vi.mock('./invoice-service', () => ({ issueInvoiceForPaidSubscriptionPayment: mocks.invoice }))

function resetPendingSubscription() {
  purchase = {
    id: purchaseId,
    status: 'PAID',
    molliePaymentId: null,
    mollieCheckoutUrl: null,
    paidAt: new Date('2026-08-09T12:00:00Z'),
    amountInclVatCents: 5_929,
  }
  current = {
    id: subscriptionId,
    organizationId,
    status: 'PENDING_MANDATE',
    planLabel: 'WorkMatchr Pro',
    amountExclVatCents: 4_900,
    vatRateBps: 2_100,
    vatAmountCents: 1_029,
    amountInclVatCents: 5_929,
    currency: 'EUR',
    mollieCustomerId: 'cst_test',
    mollieMandateId: null,
    mollieMandateStatus: null,
    mollieMandateMethod: null,
    mollieSubscriptionId: null,
    firstPaymentPurchase: purchase,
    firstPaymentAttempts: [],
  }
}

function remoteSubscription(method: 'directdebit' | 'creditcard' = 'directdebit'): MollieSubscriptionSnapshot {
  return {
    id: 'sub_test',
    status: 'active',
    amountValue: '59.29',
    currency: 'EUR',
    interval: '1 month',
    mandateId: `mdt_${method}`,
    method,
    metadata: { subscriptionId, organizationId },
  }
}

function gateway(): MollieGateway {
  return {
    createCustomer: mocks.createCustomer,
    createPayment: mocks.createPayment,
    createSubscription: mocks.createSubscription,
    findCustomerSubscription: mocks.findRemoteSubscription,
    listCustomerMandates: mocks.listMandates,
    listFirstPaymentMethods: mocks.listFirstPaymentMethods,
  } as unknown as MollieGateway
}

function recurringPayment(status: MolliePaymentSnapshot['status']): MolliePaymentSnapshot {
  return {
    id: 'tr_recurring',
    status,
    amountValue: '59.29',
    currency: 'EUR',
    metadata: { subscriptionId, organizationId },
    paidAt: status === 'paid' ? '2026-09-09T12:00:00Z' : null,
    createdAt: '2026-09-09T12:00:00Z',
    checkoutUrl: null,
    subscriptionId: 'sub_test',
    mandateId: 'mdt_directdebit',
    method: 'directdebit',
  }
}

describe('WorkMatchr Pro via first payment en recurring mandate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('MOLLIE_API_KEY', 'test_fictief')
    vi.stubEnv('MOLLIE_WEBHOOK_BASE_URL', 'https://www.vkam-adviseur.nl')
    vi.stubEnv('MOLLIE_REDIRECT_BASE_URL', 'https://www.vkam-adviseur.nl')
    resetPendingSubscription()
    mocks.authorize.mockResolvedValue({ role: 'OWNER' })
    mocks.createCustomer.mockResolvedValue({ id: 'cst_test' })
    mocks.createPayment.mockResolvedValue({ id: 'tr_first', checkoutUrl: 'https://checkout.example.invalid' })
    mocks.listMandates.mockResolvedValue([{ id: 'mdt_directdebit', status: 'valid', method: 'directdebit' }])
    mocks.listFirstPaymentMethods.mockResolvedValue(['ideal', 'creditcard'])
    mocks.findRemoteSubscription.mockResolvedValue(null)
    mocks.createSubscription.mockResolvedValue(remoteSubscription())
    mocks.eventCount.mockResolvedValue(0)
    mocks.paymentUpsert.mockResolvedValue({ id: '50000000-0000-4000-8000-000000000001' })
    mocks.invoice.mockResolvedValue({ id: '60000000-0000-4000-8000-000000000001' })
  })

  it('maakt de eerste maand voor 59,29 aan met customer, first sequence, iDEAL en kaart', async () => {
    current = null as unknown as Record<string, unknown>
    const { createProSubscriptionCheckout } = await import('./subscription-service')
    await createProSubscriptionCheckout({
      actorUserId,
      organizationId,
      billingAddress: {
        organizationName: 'Testprofessional',
        addressLine: 'Teststraat 1',
        postalCode: '1234 AB',
        city: 'Assen',
        countryCode: 'NL',
      },
      idempotencyKey: 'pro-checkout-acceptance',
    }, gateway())

    expect(mocks.createPayment).toHaveBeenCalledWith(expect.objectContaining({
      amountValue: '59.29',
      customerId: 'cst_test',
      sequenceType: 'first',
      methods: ['ideal', 'creditcard'],
    }))
  })

  it('start fail-closed wanneer Mollie geen geschikte first-paymentmethode aanbiedt', async () => {
    current = null as unknown as Record<string, unknown>
    mocks.listFirstPaymentMethods.mockResolvedValue([])
    const { createProSubscriptionCheckout } = await import('./subscription-service')
    await expect(createProSubscriptionCheckout({
      actorUserId,
      organizationId,
      billingAddress: {
        organizationName: 'Testprofessional',
        addressLine: 'Teststraat 1',
        postalCode: '1234 AB',
        city: 'Assen',
        countryCode: 'NL',
      },
      idempotencyKey: 'pro-checkout-provider-unavailable',
    }, gateway())).rejects.toThrow('MOLLIE_PRO_FIRST_PAYMENT_METHOD_UNAVAILABLE')

    expect(mocks.createPayment).not.toHaveBeenCalled()
    expect(purchase).toMatchObject({ status: 'FAILED' })
    expect(transaction.financialPurchase.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'FAILED', terminalAt: expect.any(Date) }),
    }))
  })

  it('herstelt een lokale CREATED-poging zonder Mollie-identificatie naar een nieuwe retry', async () => {
    purchase = { ...purchase, status: 'CREATED', molliePaymentId: null, mollieCheckoutUrl: null }
    current = { ...current, firstPaymentAttempts: [{ attemptNumber: 1, purchase }], firstPaymentPurchase: purchase }
    const { createProSubscriptionCheckout } = await import('./subscription-service')

    await createProSubscriptionCheckout({
      actorUserId, organizationId,
      billingAddress: { organizationName: 'Testprofessional', addressLine: 'Teststraat 1', postalCode: '1234 AB', city: 'Assen', countryCode: 'NL' },
      idempotencyKey: 'recover-local-created-attempt',
    }, gateway())

    expect(transaction.financialPurchase.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: purchaseId }, data: expect.objectContaining({ status: 'FAILED', terminalAt: expect.any(Date) }),
    }))
    expect(mocks.firstPaymentAttemptCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ subscriptionId, attemptNumber: 2 }),
    }))
    expect(mocks.createPayment).toHaveBeenCalledTimes(1)
  })

  it('start geen tweede checkout voor een CREATED-poging met Mollie payment-ID', async () => {
    purchase = { ...purchase, status: 'CREATED', molliePaymentId: 'tr_existing', mollieCheckoutUrl: null }
    current = { ...current, firstPaymentAttempts: [{ attemptNumber: 1, purchase }], firstPaymentPurchase: purchase }
    const { createProSubscriptionCheckout } = await import('./subscription-service')

    await expect(createProSubscriptionCheckout({
      actorUserId, organizationId,
      billingAddress: { organizationName: 'Testprofessional', addressLine: 'Teststraat 1', postalCode: '1234 AB', city: 'Assen', countryCode: 'NL' },
      idempotencyKey: 'created-with-provider-payment',
    }, gateway())).rejects.toMatchObject({ code: 'CONFLICT' })

    expect(mocks.createPayment).not.toHaveBeenCalled()
    expect(mocks.firstPaymentAttemptCreate).not.toHaveBeenCalled()
  })

  it('markeert een mislukte Mollie payment-aanmaak terminal en herstelbaar', async () => {
    current = null as unknown as Record<string, unknown>
    mocks.createPayment.mockRejectedValue({ statusCode: 422, code: 'payment_rejected', type: 'request' })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { createProSubscriptionCheckout } = await import('./subscription-service')

    try {
      await expect(createProSubscriptionCheckout({
        actorUserId, organizationId,
        billingAddress: { organizationName: 'Testprofessional', addressLine: 'Teststraat 1', postalCode: '1234 AB', city: 'Assen', countryCode: 'NL' },
        idempotencyKey: 'mollie-payment-create-fails',
      }, gateway())).rejects.toMatchObject({ code: 'payment_rejected' })

      expect(purchase).toMatchObject({ status: 'FAILED' })
      expect(mocks.eventUpsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({ eventType: 'PRO_FIRST_PAYMENT_START_FAILED', reason: 'MOLLIE_PAYMENT_REJECTED' }),
      }))
      expect(errorSpy).toHaveBeenCalledWith('pro_first_payment_failure', expect.objectContaining({
        category: 'MOLLIE_PAYMENT_REJECTED', step: 'payment_create', httpStatus: 422,
      }))
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('logt bij een Mollie-fout uitsluitend veilige technische retrydiagnostiek', async () => {
    current = null as unknown as Record<string, unknown>
    mocks.listFirstPaymentMethods.mockRejectedValue({ statusCode: 422, code: 'method_unavailable', type: 'request' })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { createProSubscriptionCheckout } = await import('./subscription-service')
    try {
      await expect(createProSubscriptionCheckout({
        actorUserId,
        organizationId,
        billingAddress: { organizationName: 'Testprofessional', addressLine: 'Teststraat 1', postalCode: '1234 AB', city: 'Assen', countryCode: 'NL' },
        idempotencyKey: 'safe-pro-diagnostic',
      }, gateway())).rejects.toMatchObject({ code: 'method_unavailable' })

      expect(errorSpy).toHaveBeenCalledWith('pro_first_payment_failure', expect.objectContaining({
        category: 'MOLLIE_METHOD_UNAVAILABLE', step: 'first_payment_methods', httpStatus: 422, mollieErrorCode: 'method_unavailable', mollieErrorType: 'request',
      }))
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('professional@example.invalid')
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('Teststraat')
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('biedt alleen kaart wanneer Mollie iDEAL nog niet provider-ready meldt', async () => {
    current = null as unknown as Record<string, unknown>
    mocks.listFirstPaymentMethods.mockResolvedValue(['creditcard'])
    const { createProSubscriptionCheckout } = await import('./subscription-service')
    await createProSubscriptionCheckout({
      actorUserId,
      organizationId,
      billingAddress: {
        organizationName: 'Testprofessional',
        addressLine: 'Teststraat 1',
        postalCode: '1234 AB',
        city: 'Assen',
        countryCode: 'NL',
      },
      idempotencyKey: 'pro-checkout-card-fallback',
    }, gateway())

    expect(mocks.createPayment).toHaveBeenCalledWith(expect.objectContaining({ methods: ['creditcard'] }))
  })

  it.each(['FAILED', 'CANCELED', 'EXPIRED'] as const)('maakt na een terminale eerste betaling veilig een nieuwe poging voor %s', async (status) => {
    purchase = {
      ...purchase,
      status,
      molliePaymentId: `tr_${status.toLowerCase()}`,
      mollieCheckoutUrl: null,
    }
    current = {
      ...current,
      status: 'PENDING_MANDATE',
      mollieMandateId: null,
      mollieMandateStatus: null,
      mollieMandateMethod: null,
      mollieSubscriptionId: null,
      firstPaymentPurchase: purchase,
      firstPaymentAttempts: [],
    }
    const { createProSubscriptionCheckout } = await import('./subscription-service')
    const result = await createProSubscriptionCheckout({
      actorUserId,
      organizationId,
      billingAddress: {
        organizationName: 'Testprofessional', addressLine: 'Teststraat 1', postalCode: '1234 AB', city: 'Assen', countryCode: 'NL',
      },
      idempotencyKey: `retry-${status.toLowerCase()}`,
    }, gateway())

    expect(transaction.professionalSubscription.create).not.toHaveBeenCalled()
    expect(mocks.firstPaymentAttemptCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ subscriptionId, attemptNumber: 1 }),
    }))
    expect(mocks.createPayment).toHaveBeenCalledTimes(1)
    expect(result.checkoutUrl).toBe('https://checkout.example.invalid')
  })

  it('start geen tweede checkout voor een werkelijk lopende eerste betaling', async () => {
    purchase = { ...purchase, status: 'PAYMENT_PENDING', mollieCheckoutUrl: 'https://checkout.example.invalid' }
    current = { ...current, status: 'PENDING_MANDATE', firstPaymentPurchase: purchase, firstPaymentAttempts: [] }
    const { createProSubscriptionCheckout } = await import('./subscription-service')
    const result = await createProSubscriptionCheckout({
      actorUserId, organizationId,
      billingAddress: { organizationName: 'Testprofessional', addressLine: 'Teststraat 1', postalCode: '1234 AB', city: 'Assen', countryCode: 'NL' },
      idempotencyKey: 'pending-must-not-retry',
    }, gateway())

    expect(result.checkoutUrl).toBe('https://checkout.example.invalid')
    expect(mocks.createPayment).not.toHaveBeenCalled()
    expect(mocks.firstPaymentAttemptCreate).not.toHaveBeenCalled()
  })

  it('weigert first-payment retry voor een actief Pro-abonnement', async () => {
    current = { ...current, status: 'ACTIVE', mollieMandateId: 'mdt_directdebit', mollieSubscriptionId: 'sub_test', firstPaymentAttempts: [] }
    const { createProSubscriptionCheckout } = await import('./subscription-service')
    await expect(createProSubscriptionCheckout({
      actorUserId, organizationId,
      billingAddress: { organizationName: 'Testprofessional', addressLine: 'Teststraat 1', postalCode: '1234 AB', city: 'Assen', countryCode: 'NL' },
      idempotencyKey: 'active-must-not-retry',
    }, gateway())).rejects.toMatchObject({ code: 'INVALID_STATE' })
    expect(mocks.createPayment).not.toHaveBeenCalled()
    expect(mocks.firstPaymentAttemptCreate).not.toHaveBeenCalled()
  })

  it('kiest een geldig SEPA-mandate vóór een geldig kaartmandate en activeert pas daarna', async () => {
    mocks.listMandates.mockResolvedValue([
      { id: 'mdt_creditcard', status: 'valid', method: 'creditcard' },
      { id: 'mdt_directdebit', status: 'valid', method: 'directdebit' },
    ])
    const { activateProAfterFirstPayment } = await import('./subscription-service')
    const result = await activateProAfterFirstPayment(subscriptionId, gateway())

    expect(mocks.createSubscription).toHaveBeenCalledWith(expect.objectContaining({
      amountValue: '59.29',
      mandateId: 'mdt_directdebit',
      method: 'directdebit',
      startDate: '2026-09-09',
    }))
    expect(result).toMatchObject({
      status: 'ACTIVE',
      mollieMandateId: 'mdt_directdebit',
      mollieMandateStatus: 'valid',
      mollieMandateMethod: 'directdebit',
      mollieSubscriptionId: 'sub_test',
    })
    expect(mocks.eventUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ eventType: 'PRO_MANDATE_ACTIVATED' }),
    }))
    expect(mocks.eventUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        eventType: 'PRO_REMOTE_SUBSCRIPTION_LINKED',
        metadata: expect.objectContaining({ attemptNumber: 1, reusedRemoteSubscription: false }),
      }),
    }))
  })

  it('blijft fail-closed zonder geldig mandate', async () => {
    mocks.listMandates.mockResolvedValue([{ id: 'mdt_pending', status: 'pending', method: 'directdebit' }])
    const { activateProAfterFirstPayment } = await import('./subscription-service')
    await expect(activateProAfterFirstPayment(subscriptionId, gateway())).rejects.toThrow('MOLLIE_VALID_MANDATE_MISSING')

    expect(current.status).toBe('PENDING_MANDATE')
    expect(mocks.createSubscription).not.toHaveBeenCalled()
  })

  it('behoudt kaart als veilig alternatief wanneer dit het geldige first-paymentmandate is', async () => {
    mocks.listMandates.mockResolvedValue([{ id: 'mdt_creditcard', status: 'valid', method: 'creditcard' }])
    mocks.createSubscription.mockResolvedValue(remoteSubscription('creditcard'))
    const { activateProAfterFirstPayment } = await import('./subscription-service')
    await activateProAfterFirstPayment(subscriptionId, gateway())

    expect(mocks.createSubscription).toHaveBeenCalledWith(expect.objectContaining({
      mandateId: 'mdt_creditcard',
      method: 'creditcard',
    }))
  })

  it('hergebruikt een al aangemaakte Mollie-subscription bij webhookretry', async () => {
    mocks.findRemoteSubscription.mockResolvedValue(remoteSubscription())
    const { activateProAfterFirstPayment } = await import('./subscription-service')
    await activateProAfterFirstPayment(subscriptionId, gateway())

    expect(mocks.createSubscription).not.toHaveBeenCalled()
    expect(current).toMatchObject({ status: 'ACTIVE', mollieSubscriptionId: 'sub_test' })
  })

  it('registreert een veilige lookupfailure en maakt geen remote subscription', async () => {
    mocks.findRemoteSubscription.mockRejectedValue(Object.assign(new Error('Service unavailable.'), {
      statusCode: 503,
      code: 'service_unavailable',
    }))
    const { activateProAfterFirstPayment } = await import('./subscription-service')

    await expect(activateProAfterFirstPayment(subscriptionId, gateway())).rejects.toThrow('Service unavailable.')

    expect(mocks.createSubscription).not.toHaveBeenCalled()
    expect(mocks.eventCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: 'PRO_REMOTE_SUBSCRIPTION_LOOKUP_FAILED',
        reason: 'MOLLIE_REMOTE_SUBSCRIPTION_LOOKUP_FAILED',
        metadata: expect.objectContaining({ provider: 'MOLLIE', operation: 'SUBSCRIPTION_LOOKUP', httpStatus: 503, attemptNumber: 1 }),
      }),
    }))
    expect(current).toMatchObject({ status: 'PENDING_MANDATE', mollieSubscriptionId: null })
  })

  it.each([
    [422, 'MOLLIE_REMOTE_SUBSCRIPTION_CREATE_REJECTED'],
    [503, 'MOLLIE_REMOTE_SUBSCRIPTION_CREATE_FAILED'],
  ])('registreert createfailure HTTP %i zonder lokale activatie', async (statusCode, reason) => {
    mocks.createSubscription.mockRejectedValue(Object.assign(new Error('Provider request failed.'), {
      statusCode,
      code: 'provider_failure',
      field: 'startDate',
    }))
    const { activateProAfterFirstPayment } = await import('./subscription-service')

    await expect(activateProAfterFirstPayment(subscriptionId, gateway())).rejects.toThrow('Provider request failed.')

    expect(mocks.eventCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: 'PRO_REMOTE_SUBSCRIPTION_CREATE_FAILED',
        reason,
        metadata: expect.objectContaining({ provider: 'MOLLIE', operation: 'SUBSCRIPTION_CREATE', httpStatus: statusCode, providerErrorField: 'startDate' }),
      }),
    }))
    expect(current).toMatchObject({ status: 'PENDING_MANDATE', mollieSubscriptionId: null })
  })

  it('kan na een createfailure veilig retryen zonder nieuwe lokale of remote duplicaten', async () => {
    mocks.createSubscription
      .mockRejectedValueOnce(Object.assign(new Error('Temporary provider failure.'), { statusCode: 503 }))
      .mockResolvedValueOnce(remoteSubscription())
    mocks.eventCount.mockResolvedValueOnce(0).mockResolvedValueOnce(1)
    const { activateProAfterFirstPayment, retryPendingProRemoteSubscription } = await import('./subscription-service')

    await expect(activateProAfterFirstPayment(subscriptionId, gateway())).rejects.toThrow('Temporary provider failure.')
    current = {
      ...current,
      mollieMandateId: 'mdt_directdebit',
      mollieMandateStatus: 'valid',
      mollieMandateMethod: 'directdebit',
    }
    await retryPendingProRemoteSubscription(subscriptionId, gateway())

    expect(mocks.createSubscription).toHaveBeenCalledTimes(2)
    expect(mocks.eventCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: 'PRO_REMOTE_SUBSCRIPTION_ATTEMPT_STARTED',
        metadata: expect.objectContaining({ attemptNumber: 2 }),
      }),
    }))
    expect(current).toMatchObject({ status: 'ACTIVE', mollieSubscriptionId: 'sub_test' })
    expect(mocks.invoice).not.toHaveBeenCalled()
  })

  it('hervat een betaalde PENDING_MANDATE rechtstreeks vanaf de remote subscriptionfase', async () => {
    current = {
      ...current,
      mollieMandateId: 'mdt_directdebit',
      mollieMandateStatus: 'valid',
      mollieMandateMethod: 'directdebit',
    }
    const { retryPendingProRemoteSubscription } = await import('./subscription-service')
    await retryPendingProRemoteSubscription(subscriptionId, gateway())

    expect(mocks.listMandates).not.toHaveBeenCalled()
    expect(mocks.findRemoteSubscription).toHaveBeenCalledTimes(1)
    expect(mocks.createSubscription).toHaveBeenCalledTimes(1)
    expect(current).toMatchObject({ status: 'ACTIVE', mollieSubscriptionId: 'sub_test' })
  })

  it('gebruikt bij recovery de geslaagde immutable retrypurchase wanneer de eerste purchase failed bleef', async () => {
    current = {
      ...current,
      firstPaymentPurchase: { ...purchase, status: 'FAILED', paidAt: null },
      firstPaymentAttempts: [{ purchase: { ...purchase, status: 'PAID', paidAt: purchase.paidAt } }],
      mollieMandateId: 'mdt_directdebit',
      mollieMandateStatus: 'valid',
      mollieMandateMethod: 'directdebit',
    }
    const { retryPendingProRemoteSubscription } = await import('./subscription-service')
    await retryPendingProRemoteSubscription(subscriptionId, gateway())

    expect(mocks.createSubscription).toHaveBeenCalledTimes(1)
    expect(current).toMatchObject({ status: 'ACTIVE', mollieSubscriptionId: 'sub_test' })
  })

  it('hergebruikt bij retry een remote subscription die tussen pogingen verscheen', async () => {
    current = {
      ...current,
      mollieMandateId: 'mdt_directdebit',
      mollieMandateStatus: 'valid',
      mollieMandateMethod: 'directdebit',
    }
    mocks.findRemoteSubscription.mockResolvedValue(remoteSubscription())
    const { retryPendingProRemoteSubscription } = await import('./subscription-service')
    await retryPendingProRemoteSubscription(subscriptionId, gateway())

    expect(mocks.findRemoteSubscription).toHaveBeenCalledWith('cst_test', subscriptionId)
    expect(mocks.createSubscription).not.toHaveBeenCalled()
    expect(current).toMatchObject({ status: 'ACTIVE', mollieSubscriptionId: 'sub_test' })
    expect(mocks.eventUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        eventType: 'PRO_REMOTE_SUBSCRIPTION_LINKED',
        metadata: expect.objectContaining({ reusedRemoteSubscription: true }),
      }),
    }))
  })

  it.each([
    ['ontbrekende methode', null],
    ['lege methode', ''],
    ['overeenkomende methode', 'directdebit'],
  ])('accepteert een exact mandate met %s', async (_label, method) => {
    current = {
      ...current,
      mollieMandateId: 'mdt_directdebit',
      mollieMandateStatus: 'valid',
      mollieMandateMethod: 'directdebit',
    }
    mocks.findRemoteSubscription.mockResolvedValue({ ...remoteSubscription(), method })
    const { retryPendingProRemoteSubscription } = await import('./subscription-service')

    await retryPendingProRemoteSubscription(subscriptionId, gateway())

    expect(current).toMatchObject({ status: 'ACTIVE', mollieSubscriptionId: 'sub_test' })
    expect(mocks.createSubscription).not.toHaveBeenCalled()
  })

  it.each([
    ['verkeerd mandate', { mandateId: 'mdt_other' }],
    ['conflicterende methode', { method: 'creditcard' }],
    ['verkeerd bedrag', { amountValue: '59.30' }],
    ['verkeerde valuta', { currency: 'USD' }],
    ['verkeerd interval', { interval: '2 months' }],
    ['ongeldige status', { status: 'canceled' }],
    ['andere lokale subscription', { metadata: { subscriptionId: 'other-subscription', organizationId } }],
    ['andere organisatie', { metadata: { subscriptionId, organizationId: 'other-organization' } }],
  ])('weigert fail-closed een remote subscription met %s', async (_label, override) => {
    current = {
      ...current,
      mollieMandateId: 'mdt_directdebit',
      mollieMandateStatus: 'valid',
      mollieMandateMethod: 'directdebit',
    }
    mocks.findRemoteSubscription.mockResolvedValue({ ...remoteSubscription(), ...override })
    const { retryPendingProRemoteSubscription } = await import('./subscription-service')

    await expect(retryPendingProRemoteSubscription(subscriptionId, gateway()))
      .rejects.toThrow('MOLLIE_SUBSCRIPTION_MISMATCH')

    expect(current).toMatchObject({ status: 'PENDING_MANDATE', mollieSubscriptionId: null })
    expect(mocks.createSubscription).not.toHaveBeenCalled()
  })

  it('maakt bij replay geen tweede remote subscription of lokale subscription', async () => {
    const { activateProAfterFirstPayment } = await import('./subscription-service')
    await activateProAfterFirstPayment(subscriptionId, gateway())
    await activateProAfterFirstPayment(subscriptionId, gateway())

    expect(mocks.createSubscription).toHaveBeenCalledTimes(1)
    expect(current).toMatchObject({ status: 'ACTIVE', mollieSubscriptionId: 'sub_test' })
  })

  it('verwerkt een succesvolle maandincasso en maakt de maandfactuur via de bestaande idempotente service', async () => {
    current = { ...current, status: 'ACTIVE', mollieSubscriptionId: 'sub_test', mollieMandateId: 'mdt_directdebit', mollieMandateMethod: 'directdebit' }
    const { processRecurringProPayment } = await import('./subscription-service')
    await processRecurringProPayment(recurringPayment('paid'))

    expect(current).toMatchObject({ status: 'ACTIVE', pastDueAt: null, retryCount: 0 })
    expect(mocks.paymentUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ amountInclVatCents: 5_929, status: 'PAID',
        periodStart: new Date('2026-09-09T12:00:00Z'), periodEnd: new Date('2026-10-09T12:00:00Z') }),
    }))
    expect(mocks.invoice).toHaveBeenCalledWith(transaction, '50000000-0000-4000-8000-000000000001', expect.any(Date))
  })

  it('zet een mislukte maandincasso op PAST_DUE zonder credits te wijzigen', async () => {
    current = { ...current, status: 'ACTIVE', mollieSubscriptionId: 'sub_test', mollieMandateId: 'mdt_directdebit', mollieMandateMethod: 'directdebit' }
    const { processRecurringProPayment } = await import('./subscription-service')
    await processRecurringProPayment(recurringPayment('failed'))

    expect(current).toMatchObject({ status: 'PAST_DUE', retryCount: 1 })
    expect(mocks.invoice).not.toHaveBeenCalled()
  })

  it('weigert een terugkerende betaling van een ander mandate', async () => {
    current = { ...current, status: 'ACTIVE', mollieSubscriptionId: 'sub_test', mollieMandateId: 'mdt_directdebit', mollieMandateMethod: 'directdebit' }
    const payment = { ...recurringPayment('paid'), mandateId: 'mdt_other' }
    const { processRecurringProPayment } = await import('./subscription-service')
    await expect(processRecurringProPayment(payment)).rejects.toThrow('MOLLIE_MANDATE_MISMATCH')
    expect(mocks.paymentUpsert).not.toHaveBeenCalled()
  })
})
