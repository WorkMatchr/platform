import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ requirePlatformAdministrator: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: vi.fn() }))
vi.mock('@/lib/finance/financial-invoice-pdf', () => ({ buildFinancialInvoicePdf: vi.fn(), financialInvoicePdfFilename: vi.fn(() => 'WorkMatchr-factuur-WM-1.pdf') }))

describe('platformbeheer factuur-PDF-route', () => {
  beforeEach(() => vi.clearAllMocks())

  it('vereist platformbeheer en levert daarna de immutable factuur-PDF', async () => {
    const { requirePlatformAdministrator } = await import('@/lib/platform-admin/platform-admin-authorization')
    const { getPrisma } = await import('@/lib/prisma')
    const { buildFinancialInvoicePdf } = await import('@/lib/finance/financial-invoice-pdf')
    vi.mocked(requirePlatformAdministrator).mockResolvedValue({ id: 'platform-admin' } as never)
    vi.mocked(getPrisma).mockReturnValue({ financialInvoice: { findUnique: vi.fn().mockResolvedValue({ id: 'invoice-a', invoiceNumber: 'WM-1' }) } } as never)
    vi.mocked(buildFinancialInvoicePdf).mockResolvedValue(new Uint8Array([1, 2, 3]))

    const { GET } = await import('./route')
    const response = await GET(new Request('https://workmatchr.invalid/platformbeheer/financien/facturen/invoice-a/pdf'), { params: Promise.resolve({ invoiceId: 'invoice-a' }) })

    expect(response.status).toBe(200)
    expect(requirePlatformAdministrator).toHaveBeenCalledWith('/platformbeheer/financien/facturen/invoice-a/pdf')
    expect(vi.mocked(getPrisma)().financialInvoice.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'invoice-a' } }))
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('geeft geen onbekende factuur prijs', async () => {
    const { requirePlatformAdministrator } = await import('@/lib/platform-admin/platform-admin-authorization')
    const { getPrisma } = await import('@/lib/prisma')
    vi.mocked(requirePlatformAdministrator).mockResolvedValue({ id: 'platform-admin' } as never)
    vi.mocked(getPrisma).mockReturnValue({ financialInvoice: { findUnique: vi.fn().mockResolvedValue(null) } } as never)

    const { GET } = await import('./route')
    const response = await GET(new Request('https://workmatchr.invalid/platformbeheer/financien/facturen/onbekend/pdf'), { params: Promise.resolve({ invoiceId: 'onbekend' }) })
    expect(response.status).toBe(404)
  })
})
