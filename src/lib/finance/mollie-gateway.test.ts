import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  createPayment: vi.fn(),
  createSubscription: vi.fn(),
  iterateSubscriptions: vi.fn(),
  listMethods: vi.fn(),
  listMandates: vi.fn(),
}))

vi.mock('@mollie/api-client', () => ({
  default: () => ({
    payments: { create: mocks.createPayment },
    methods: { list: mocks.listMethods },
    customerMandates: { page: mocks.listMandates },
    customerSubscriptions: {
      create: mocks.createSubscription,
      iterate: mocks.iterateSubscriptions,
    },
  }),
  PaymentMethod: { ideal: 'ideal', creditcard: 'creditcard' },
  SequenceType: { oneoff: 'oneoff', first: 'first', recurring: 'recurring' },
}))

import { centsToMollieValue, createMollieGateway, mollieValueToCents } from './mollie-gateway'

function remoteSubscription() {
  return {
    id: 'sub_test',
    status: 'active',
    amount: { value: '59.29', currency: 'EUR' },
    interval: '1 month',
    mandateId: 'mdt_test',
    method: 'directdebit',
    metadata: {
      subscriptionId: '30000000-0000-4000-8000-000000000001',
      organizationId: '20000000-0000-4000-8000-000000000001',
    },
  }
}

describe('Mollie-bedragconversie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('MOLLIE_API_KEY', 'test_fictief')
    vi.stubEnv('MOLLIE_WEBHOOK_BASE_URL', 'https://example.invalid')
    vi.stubEnv('MOLLIE_REDIRECT_BASE_URL', 'https://example.invalid')
    mocks.createPayment.mockResolvedValue({
      id: 'tr_test',
      status: 'open',
      amount: { value: '59.29', currency: 'EUR' },
      metadata: {},
      getCheckoutUrl: () => 'https://checkout.example.invalid',
    })
    mocks.createSubscription.mockResolvedValue(remoteSubscription())
    mocks.listMandates.mockResolvedValue([])
    mocks.listMethods.mockResolvedValue([
      { id: 'ideal', description: 'iDEAL' },
      { id: 'creditcard', description: 'Creditcard' },
      { id: 'paypal', description: 'PayPal' },
    ])
    mocks.iterateSubscriptions.mockReturnValue((async function* () {})())
  })

  afterEach(() => vi.unstubAllEnvs())

  it.each([[0, '0.00'], [1, '0.01'], [121, '1.21'], [3_025, '30.25'], [5_929, '59.29']])(
    'converteert %i cent verliesvrij naar %s',
    (cents, value) => {
      expect(centsToMollieValue(cents)).toBe(value)
      expect(mollieValueToCents(value)).toBe(cents)
    },
  )

  it('weigert floats, negatieve bedragen en ongeldige Mollie-notatie', () => {
    expect(() => centsToMollieValue(1.5)).toThrow('INVALID_MONEY_AMOUNT')
    expect(() => centsToMollieValue(-1)).toThrow('INVALID_MONEY_AMOUNT')
    expect(() => mollieValueToCents('12,50')).toThrow('INVALID_MOLLIE_AMOUNT')
  })

  it('maakt de eerste Pro-betaling met iDEAL en kaart als first-paymentmethoden', async () => {
    const gateway = createMollieGateway()
    await gateway.createPayment({
      amountValue: '59.29',
      currency: 'EUR',
      description: 'WorkMatchr Pro eerste maand',
      redirectUrl: 'https://example.invalid/redirect',
      webhookUrl: 'https://example.invalid/webhook',
      metadata: {
        purchaseId: '10000000-0000-4000-8000-000000000001',
        organizationId: '20000000-0000-4000-8000-000000000001',
      },
      idempotencyKey: 'pro-first-test',
      customerId: 'cst_test',
      sequenceType: 'first',
      methods: ['ideal', 'creditcard'],
    })

    expect(mocks.createPayment).toHaveBeenCalledWith(expect.objectContaining({
      amount: { value: '59.29', currency: 'EUR' },
      customerId: 'cst_test',
      sequenceType: 'first',
      method: ['ideal', 'creditcard'],
    }))
  })

  it('beperkt providerbeschikbaarheid tot ondersteunde eerste Pro-betaalmethoden', async () => {
    const methods = await createMollieGateway().listFirstPaymentMethods('59.29')
    expect(methods).toEqual(['ideal', 'creditcard'])
    expect(mocks.listMethods).toHaveBeenCalledWith(expect.objectContaining({
      sequenceType: 'first',
      amount: { value: '59.29', currency: 'EUR' },
    }))
  })

  it('leest beschikbare eenmalige betaalmethoden zonder een payment aan te maken', async () => {
    const methods = await createMollieGateway().listOneoffPaymentMethods('30.25')

    expect(methods).toEqual([
      { id: 'ideal', name: 'iDEAL' },
      { id: 'creditcard', name: 'Creditcard' },
      { id: 'paypal', name: 'PayPal' },
    ])
    expect(mocks.listMethods).toHaveBeenCalledWith({
      sequenceType: 'oneoff',
      amount: { value: '30.25', currency: 'EUR' },
    })
    expect(mocks.createPayment).not.toHaveBeenCalled()
  })

  it('leest uitsluitend veilige mandatevelden uit Mollie', async () => {
    mocks.listMandates.mockResolvedValue([{
      id: 'mdt_test',
      status: 'valid',
      method: 'directdebit',
      details: { consumerAccount: 'verborgen' },
    }])
    const result = await createMollieGateway().listCustomerMandates('cst_test')

    expect(result).toEqual([{ id: 'mdt_test', status: 'valid', method: 'directdebit' }])
    expect(result[0]).not.toHaveProperty('details')
  })

  it.each(['directdebit', 'creditcard'] as const)(
    'bindt de maandelijkse subscription uitsluitend aan een expliciete %s-mandate',
    async (method) => {
      await createMollieGateway().createSubscription({
        customerId: 'cst_test',
        amountValue: '59.29',
        currency: 'EUR',
        interval: '1 month',
        description: 'WorkMatchr Pro maandabonnement',
        webhookUrl: 'https://example.invalid/webhook',
        mandateId: 'mdt_test',
        method,
        startDate: '2026-09-09',
        idempotencyKey: 'pro-subscription-test',
        metadata: {
          subscriptionId: '30000000-0000-4000-8000-000000000001',
          organizationId: '20000000-0000-4000-8000-000000000001',
        },
      })

      const payload = mocks.createSubscription.mock.calls[0]?.[0]
      expect(payload).toEqual(expect.objectContaining({
        amount: { value: '59.29', currency: 'EUR' },
        mandateId: 'mdt_test',
        startDate: '2026-09-09',
      }))
      expect(payload).not.toHaveProperty('method')
    },
  )

  it('behoudt de betaalmethode wanneer geen expliciete mandate is opgegeven', async () => {
    await createMollieGateway().createSubscription({
      customerId: 'cst_test',
      amountValue: '59.29',
      currency: 'EUR',
      interval: '1 month',
      description: 'WorkMatchr Pro maandabonnement',
      webhookUrl: 'https://example.invalid/webhook',
      method: 'directdebit',
      startDate: '2026-09-09',
      idempotencyKey: 'pro-subscription-without-mandate',
      metadata: {
        subscriptionId: '30000000-0000-4000-8000-000000000001',
        organizationId: '20000000-0000-4000-8000-000000000001',
      },
    })

    const payload = mocks.createSubscription.mock.calls[0]?.[0]
    expect(payload).toEqual(expect.objectContaining({ method: 'directdebit' }))
    expect(payload).not.toHaveProperty('mandateId')
  })

  it('vindt een bestaande remote subscription op interne referentie voor veilige retries', async () => {
    mocks.iterateSubscriptions.mockReturnValue((async function* () { yield remoteSubscription() })())
    await expect(createMollieGateway().findCustomerSubscription(
      'cst_test',
      '30000000-0000-4000-8000-000000000001',
    )).resolves.toMatchObject({ id: 'sub_test', mandateId: 'mdt_test' })
  })
})
