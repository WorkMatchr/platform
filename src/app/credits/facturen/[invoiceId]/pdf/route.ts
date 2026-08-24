import { buildFinancialInvoicePdf, financialInvoicePdfFilename } from '@/lib/finance/financial-invoice-pdf'
import { getPrisma } from '@/lib/prisma'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params
  const { activeMembership } = await requireOrganizationMembership(undefined, `/credits/facturen/${invoiceId}/pdf`)
  const invoice = await getPrisma().financialInvoice.findFirst({
    where: { id: invoiceId, organizationId: activeMembership.organization.id },
    include: { lines: { orderBy: { position: 'asc' } }, vatSummaries: { orderBy: { vatRateBps: 'asc' } } },
  })
  if (!invoice) return new Response('Niet gevonden', { status: 404 })
  const pdf = await buildFinancialInvoicePdf(invoice)
  const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer
  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${financialInvoicePdfFilename(invoice.invoiceNumber)}"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  })
}
