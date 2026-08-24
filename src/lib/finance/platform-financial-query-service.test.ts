import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const prisma = {
  financialPurchase: { count: vi.fn(), findMany: vi.fn() },
  financialInvoice: { count: vi.fn(), findMany: vi.fn() },
  financialRefund: { count: vi.fn(), findMany: vi.fn() },
}
const authorize = vi.fn().mockResolvedValue({})

vi.mock('@/lib/prisma', () => ({ getPrisma: () => prisma }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ getPlatformAdministratorContext: authorize }))

describe('platform financiële queryservice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.financialPurchase.count.mockResolvedValue(60)
    prisma.financialPurchase.findMany.mockResolvedValue([])
    prisma.financialInvoice.count.mockResolvedValue(0)
    prisma.financialInvoice.findMany.mockResolvedValue([])
    prisma.financialRefund.count.mockResolvedValue(0)
    prisma.financialRefund.findMany.mockResolvedValue([])
  })

  it('autoriseert server-side en pagineert betalingen in vaste batches', async () => {
    const { listPlatformFinancialPayments } = await import('./platform-financial-query-service')
    const result = await listPlatformFinancialPayments('platform-admin', {
      page: 2,
      status: 'PAID',
      kind: 'CREDIT_PACKAGE',
      organization: 'Acme',
      from: new Date('2026-08-01T00:00:00.000Z'),
      through: new Date('2026-08-31T23:59:59.999Z'),
    })

    expect(authorize).toHaveBeenCalledWith('platform-admin')
    expect(result).toMatchObject({ page: 2, pageCount: 3, total: 60 })
    expect(prisma.financialPurchase.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 25,
      take: 25,
      where: expect.objectContaining({ status: 'PAID', kind: 'CREDIT_PACKAGE' }),
    }))
  })

  it('vormt zonder organisatiefilter geen half relationeel refundfilter', async () => {
    const { listPlatformFinancialRefunds } = await import('./platform-financial-query-service')
    await listPlatformFinancialRefunds('platform-admin')
    expect(prisma.financialRefund.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ purchase: undefined }),
      take: 25,
    }))
  })

  it('begrensd een te hoge factuurpagina tot de laatste bestaande pagina', async () => {
    prisma.financialInvoice.count.mockResolvedValue(27)
    const { listPlatformFinancialInvoices } = await import('./platform-financial-query-service')
    const result = await listPlatformFinancialInvoices('platform-admin', { page: 99 })
    expect(result.page).toBe(2)
    expect(prisma.financialInvoice.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 25, take: 25 }))
  })
})
