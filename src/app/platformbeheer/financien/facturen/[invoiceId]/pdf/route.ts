import { buildFinancialInvoicePdf, financialInvoicePdfFilename } from '@/lib/finance/financial-invoice-pdf'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params
  await requirePlatformAdministrator(`/platformbeheer/financien/facturen/${invoiceId}/pdf`)
  const invoice = await getPrisma().financialInvoice.findUnique({
    where: { id: invoiceId },
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
