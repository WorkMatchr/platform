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
    count: vi.fn(),
  },
  creditTransaction: { groupBy: vi.fn().mockResolvedValue([]) },
  discountRedemption: { count: vi.fn().mockResolvedValue(1) },
  starterBenefitGrant: { count: vi.fn().mockResolvedValue(1) },
  professionalSubscription: { groupBy: vi.fn().mockResolvedValue([]), count: vi.fn() },
  financialJorttSync: { groupBy: vi.fn().mockResolvedValue([]), count: vi.fn() },
  financialMaintenanceRun: { findFirst: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({ getPrisma: () => prisma }))
const getPlatformAdministratorContext = vi.fn().mockResolvedValue({})
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ getPlatformAdministratorContext }))
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

describe('financiële maintenance-observability', () => {
  it('aggregeert achterstallige categorieën en signaleert een te oude succesvolle run', async () => {
    prisma.financialMaintenanceRun.findFirst
      .mockResolvedValueOnce({ status: 'PARTIAL_FAILURE', startedAt: new Date('2026-09-03T09:00:00Z'), finishedAt: new Date('2026-09-03T09:01:00Z'), errorCodes: ['SAFE_ERROR'] })
      .mockResolvedValueOnce({ status: 'SUCCEEDED', startedAt: new Date('2026-09-03T06:00:00Z'), finishedAt: new Date('2026-09-03T06:01:00Z'), errorCodes: [] })
      .mockResolvedValueOnce({ status: 'PARTIAL_FAILURE', startedAt: new Date('2026-09-03T09:00:00Z'), finishedAt: new Date('2026-09-03T09:01:00Z'), errorCodes: ['SAFE_ERROR'] })
    prisma.financialRefund.count = vi.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(2)
    prisma.professionalSubscription.count = vi.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    prisma.financialJorttSync.count = vi.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(1).mockResolvedValueOnce(2)

    const { getPlatformFinancialMaintenanceOverview } = await import('./financial-dashboard-service')
    const result = await getPlatformFinancialMaintenanceOverview('10000000-0000-4000-8000-000000000001', new Date('2026-09-03T10:00:00Z'))

    expect(result).toMatchObject({
      pendingRefunds: 3,
      agedPendingRefunds: 2,
      pendingCancellations: 3,
      overdueCancellations: 1,
      overduePro: 2,
      jorttRetryRequired: 4,
      jorttFailed: 1,
      agedJortt: 2,
      maintenanceLate: true,
    })
    expect(getPlatformAdministratorContext).toHaveBeenCalledWith('10000000-0000-4000-8000-000000000001')
  })
})
