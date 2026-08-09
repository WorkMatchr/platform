import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const prisma = {
  financialPurchase: {
    findMany: vi.fn().mockResolvedValue([
      { kind: 'CREDIT_PACKAGE', amountExclVatCents: 10_000, vatAmountCents: 2_100, amountInclVatCents: 12_100, credits: 100 },
      { kind: 'PRO_SUBSCRIPTION', amountExclVatCents: 4_900, vatAmountCents: 1_029, amountInclVatCents: 5_929, credits: 0 },
    ]),
    groupBy: vi.fn().mockResolvedValue([{ kind: 'CREDIT_PACKAGE', status: 'PAID', _count: 1 }, { kind: 'CREDIT_PACKAGE', status: 'FAILED', _count: 1 }, { kind: 'PRO_SUBSCRIPTION', status: 'PAID', _count: 1 }]),
  },
  professionalSubscriptionPayment: {
    findMany: vi.fn().mockResolvedValue([{ amountExclVatCents: 4_900, vatAmountCents: 1_029, amountInclVatCents: 5_929 }]),
    groupBy: vi.fn().mockResolvedValue([{ status: 'PAID', _count: 1 }, { status: 'FAILED', _count: 2 }]),
  },
  financialRefund: {
    findMany: vi.fn().mockResolvedValue([{ amountCents: 12_100, creditNote: { amountExclVatCents: -10_000, vatAmountCents: -2_100, amountInclVatCents: -12_100 } }]),
    groupBy: vi.fn().mockResolvedValue([{ status: 'REFUNDED', _count: 1 }, { status: 'PENDING', _count: 2 }, { status: 'FAILED', _count: 1 }]),
  },
  creditTransaction: { groupBy: vi.fn().mockResolvedValue([]) },
  discountRedemption: { count: vi.fn().mockResolvedValue(1) },
  starterBenefitGrant: { count: vi.fn().mockResolvedValue(1) },
  professionalSubscription: { groupBy: vi.fn().mockResolvedValue([]) },
  financialJorttSync: { groupBy: vi.fn().mockResolvedValue([]) },
}

vi.mock('@/lib/prisma', () => ({ getPrisma: () => prisma }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ getPlatformAdministratorContext: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/marketplace/marketplace-authorization', () => ({ requireProviderMarketplaceAccess: vi.fn() }))

describe('platformbrede financiële rapportage', () => {
  it('telt credit- en Pro-omzet bruto en trekt alleen voltooide refunds af', async () => {
    const { getPlatformFinancialDashboard } = await import('./financial-dashboard-service')
    const result = await getPlatformFinancialDashboard('10000000-0000-4000-8000-000000000001')

    expect(result.grossRevenueInclVatCents).toBe(23_958)
    expect(result.refundInclVatCents).toBe(12_100)
    expect(result.netRevenueInclVatCents).toBe(11_858)
    expect(result.grossRevenueExclVatCents).toBe(19_800)
    expect(result.netRevenueExclVatCents).toBe(9_800)
    expect(result.successfulCreditPayments).toBe(1)
    expect(result.successfulInitialProPayments).toBe(1)
    expect(result.successfulRecurringProPayments).toBe(1)
    expect(result.successfulProPayments).toBe(2)
    expect(result.failedCreditPayments).toBe(1)
    expect(result.failedProPayments).toBe(2)
    expect(result.pendingRefunds).toBe(2)
    expect(result.failedRefunds).toBe(1)
  })
})
