import { buildFinancialInvoicePdf, financialInvoicePdfFilename } from '@/lib/finance/financial-invoice-pdf'
import { getPrisma } from '@/lib/prisma'
import { requireLearningUser } from '@/lib/learning/learning-authorization'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params
  const user = await requireLearningUser(`/e-learnings/pilot/facturen/${invoiceId}`)
  const invoice = await getPrisma().financialInvoice.findFirst({
    where: { id: invoiceId, purchase:{kind:'ACADEMY_COURSE',createdByUserId:user.id},
      OR:[{organizationId:null},{organization:{status:'ACTIVE',memberships:{some:{userId:user.id,status:'ACTIVE',role:{in:['OWNER','ADMIN']}}}}}] },
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
