import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  findPro: vi.fn(),
}))

const transaction = {
  $queryRaw: vi.fn(),
  discountCode: {
    findUnique: vi.fn(),
  },
  discountRedemption: {
    count: vi.fn(async () => 0),
    findFirst: vi.fn(async () => null),
  },
  financialPurchase: {
    findFirst: vi.fn(async () => null),
  },
}

vi.mock('@/lib/prisma', () => ({ getPrisma: vi.fn() }))
vi.mock('@/lib/credits/credit-wallet-service', () => ({
  recordVerifiedDiscountBonusInTransaction: vi.fn(),
  recordVerifiedPurchaseCreditsInTransaction: vi.fn(),
}))
vi.mock('@/lib/marketplace/marketplace-authorization', () => ({
  requireProviderMarketplaceAccess: mocks.authorize,
}))
vi.mock('./invoice-service', () => ({ issueInvoiceForPaidPurchase: vi.fn() }))
vi.mock('./subscription-service', () => ({
  activateProAfterFirstPayment: vi.fn(),
  processRecurringProPayment: vi.fn(),
}))
vi.mock('./financial-transaction', () => ({
  runSerializableFinancialTransaction: (operation: (value: typeof transaction) => unknown) => operation(transaction),
}))
vi.mock('./pro-entitlement-service', () => ({ findEffectiveProSubscription: mocks.findPro }))

const actorUserId = '10000000-0000-4000-8000-000000000001'
const organizationId = '20000000-0000-4000-8000-000000000001'

describe('server-side prijscontrole voor de creditcheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authorize.mockResolvedValue({ id: actorUserId })
    mocks.findPro.mockResolvedValue(null)
    transaction.discountCode.findUnique.mockResolvedValue(null)
  })

  afterEach(() => vi.unstubAllEnvs())

  it('gebruikt voor de preview dezelfde 50-creditprijs en btw als de aankoopservice', async () => {
    const { previewCreditPurchasePrice } = await import('./financial-purchase-service')
    await expect(previewCreditPurchasePrice({ actorUserId, organizationId, packageSku: 'CREDITS_50' })).resolves.toMatchObject({
      credits: 50,
      amountExclVatCents: 5_000,
      vatAmountCents: 1_050,
      amountInclVatCents: 6_050,
    })
    expect(mocks.authorize).toHaveBeenCalledWith(transaction, actorUserId, organizationId, true)
  })

  it('neemt effectieve Pro-korting op in de serverpreview', async () => {
    mocks.findPro.mockResolvedValue({ id: 'pro-test' })
    const { previewCreditPurchasePrice } = await import('./financial-purchase-service')
    await expect(previewCreditPurchasePrice({ actorUserId, organizationId, packageSku: 'CREDITS_100' })).resolves.toMatchObject({
      packageDiscountCents: 500,
      proDiscountCents: 950,
      amountExclVatCents: 8_550,
    })
  })

  it('valideert een kortingscode server-side en verwerkt die in dezelfde prijsroute', async () => {
    transaction.discountCode.findUnique.mockResolvedValue({
      id: 'discount-test',
      code: 'VEILIG10',
      status: 'ACTIVE',
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validUntil: null,
      applicablePackageSkus: [],
      minimumAmountCents: null,
      maximumUses: null,
      oncePerOrganization: false,
      newCustomersOnly: false,
      percentageBps: 1_000,
      fixedAmountCents: null,
      bonusCredits: 0,
    })
    const { previewCreditPurchasePrice } = await import('./financial-purchase-service')
    await expect(previewCreditPurchasePrice({
      actorUserId,
      organizationId,
      packageSku: 'CREDITS_50',
      discountCode: 'veilig10',
    })).resolves.toMatchObject({
      discountCodeDiscountCents: 500,
      amountExclVatCents: 4_500,
      vatAmountCents: 945,
      amountInclVatCents: 5_445,
    })
  })

  it('houdt de sandbox-testprijs leidend en raadpleegt geen kortingscode', async () => {
    vi.stubEnv('MOLLIE_API_KEY', 'test_fictieveacceptatiesleutel')
    const { previewCreditPurchasePrice } = await import('./financial-purchase-service')
    await expect(previewCreditPurchasePrice({
      actorUserId,
      organizationId,
      packageSku: 'CREDITS_25',
      discountCode: 'VEILIG10',
    })).resolves.toMatchObject({
      pricingMode: 'MOLLIE_TEST_ACCEPTANCE',
      amountExclVatCents: 100,
      vatAmountCents: 21,
      amountInclVatCents: 121,
    })
    expect(transaction.discountCode.findUnique).not.toHaveBeenCalled()
  })
})
