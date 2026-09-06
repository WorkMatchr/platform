import { notFound } from 'next/navigation'
import { getPrisma } from '@/lib/prisma'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const invoiceIds = ['516a2763-7d62-47ce-aaad-8e2bc63d067e', 'cf9c9bac-56f9-45bb-994c-d6a1b596ff1e', '63831bd7-277a-48a7-b328-a3d7ed7eb099']

export default async function InvoiceTotalDiagnosis() {
  if (process.env.VERCEL_ENV !== 'production') notFound()
  await requirePlatformAdministrator('/platformbeheer/financien/invoice-total-diagnosis')
  const invoices = await getPrisma().financialInvoice.findMany({
    where: { id: { in: invoiceIds } }, orderBy: { invoiceNumber: 'asc' },
    select: { id: true, invoiceNumber: true, snapshotVersion: true, documentType: true, currency: true,
      amountExclVatCents: true, vatAmountCents: true, amountInclVatCents: true, vatRateBps: true,
      packageLabel: true, credits: true, baseAmountCents: true, packageDiscountCents: true, proDiscountCents: true, discountCodeDiscountCents: true,
      lines: { orderBy: { position: 'asc' }, select: { position: true, description: true, quantity: true, unit: true, unitPriceExclVatCents: true, grossAmountExclVatCents: true, discountAmountCents: true, netAmountExclVatCents: true, vatRateBps: true, vatAmountCents: true, amountInclVatCents: true } },
      vatSummaries: { orderBy: { vatRateBps: 'asc' }, select: { vatRateBps: true, taxableAmountExclVatCents: true, vatAmountCents: true, amountInclVatCents: true } },
    },
  })
  const result = invoices.map((invoice) => {
    const net = invoice.lines.reduce((sum, line) => sum + line.netAmountExclVatCents, 0)
    const vat = invoice.lines.reduce((sum, line) => sum + line.vatAmountCents, 0)
    const incl = invoice.lines.reduce((sum, line) => sum + line.amountInclVatCents, 0)
    return { ...invoice,
      adapter: { lines: invoice.lines, amountExclVatCents: invoice.amountExclVatCents, vatAmountCents: invoice.vatAmountCents, amountInclVatCents: invoice.amountInclVatCents, currency: invoice.currency, roundingApplied: false },
      sums: { net, vat, incl, adapterIncl: net + vat },
      differenceCents: { net: net - invoice.amountExclVatCents, vat: vat - invoice.vatAmountCents, incl: incl - invoice.amountInclVatCents },
    }
  })
  return <pre>{JSON.stringify(result, null, 2)}</pre>
}
