import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/organizations/organization-authorization', () => ({ requireOrganizationMembership: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: vi.fn() }))
vi.mock('@/lib/finance/financial-invoice-pdf', () => ({ buildFinancialInvoicePdf: vi.fn(), financialInvoicePdfFilename: vi.fn(() => 'WorkMatchr-factuur-WM-1.pdf') }))

describe('factuur-PDF-route', () => {
  beforeEach(() => vi.clearAllMocks())

  it('levert alleen een factuur uit de actieve organisatie', async () => {
    const { requireOrganizationMembership } = await import('@/lib/organizations/organization-authorization')
    const { getPrisma } = await import('@/lib/prisma')
    const { buildFinancialInvoicePdf } = await import('@/lib/finance/financial-invoice-pdf')
    vi.mocked(requireOrganizationMembership).mockResolvedValue({ activeMembership: { organization: { id: 'organization-a' } } } as never)
    vi.mocked(getPrisma).mockReturnValue({ financialInvoice: { findFirst: vi.fn().mockResolvedValue({ id: 'invoice-a', invoiceNumber: 'WM-1' }) } } as never)
    vi.mocked(buildFinancialInvoicePdf).mockResolvedValue(new Uint8Array([1, 2, 3]))
    const { GET } = await import('./route')
    const response = await GET(new Request('https://workmatchr.invalid/credits/facturen/invoice-a/pdf'), { params: Promise.resolve({ invoiceId: 'invoice-a' }) })
    expect(response.status).toBe(200)
    expect(vi.mocked(getPrisma)().financialInvoice.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'invoice-a', organizationId: 'organization-a' } }))
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('geeft geen factuurbestaan prijs buiten de tenant', async () => {
    const { requireOrganizationMembership } = await import('@/lib/organizations/organization-authorization')
    const { getPrisma } = await import('@/lib/prisma')
    vi.mocked(requireOrganizationMembership).mockResolvedValue({ activeMembership: { organization: { id: 'organization-a' } } } as never)
    vi.mocked(getPrisma).mockReturnValue({ financialInvoice: { findFirst: vi.fn().mockResolvedValue(null) } } as never)
    const { GET } = await import('./route')
    const response = await GET(new Request('https://workmatchr.invalid/credits/facturen/invoice-b/pdf'), { params: Promise.resolve({ invoiceId: 'invoice-b' }) })
    expect(response.status).toBe(404)
  })
})
