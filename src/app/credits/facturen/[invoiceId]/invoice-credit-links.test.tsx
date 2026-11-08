import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import InvoicePage from './page'

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ financialInvoice: { findFirst } }) }))
vi.mock('@/lib/organizations/organization-authorization', () => ({
  requireOrganizationMembership: async () => ({ activeMembership: { organization: { id: 'buyer' } } }),
}))

async function renderInvoice(corrections: { id: string; invoiceNumber: string; amountInclVatCents: number }[]) {
  findFirst.mockResolvedValueOnce({
    id: 'original', invoiceNumber: 'WM-TEST', documentType: 'INVOICE', issuedAt: new Date('2026-11-01'),
    snapshotVersion: 2, amountInclVatCents: 5929, amountExclVatCents: 4900, vatAmountCents: 1029,
    lines: [], vatSummaries: [], corrections,
  })
  return renderToStaticMarkup(await InvoicePage({ params: Promise.resolve({ invoiceId: 'original' }) }))
}

describe('creditnota op de klantfactuur', () => {
  it('toont de gekoppelde creditnota en beperkt beide documentselecties tot de actieve organisatie', async () => {
    const html = await renderInvoice([{ id: 'note', invoiceNumber: 'CN-TEST', amountInclVatCents: -1210 }])
    expect(html).toContain('href="/credits/facturen/note"')
    expect(html).toContain('Creditnota CN-TEST')
    expect(findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: 'original', organizationId: 'buyer' },
      include: expect.objectContaining({ corrections: expect.objectContaining({
        where: { organizationId: 'buyer', documentType: 'CREDIT_NOTE' },
      }) }),
    }))
  })

  it('houdt de factuur zonder correcties vrij van een lege sectie', async () => {
    expect(await renderInvoice([])).not.toContain('bij deze factuur')
  })
})
