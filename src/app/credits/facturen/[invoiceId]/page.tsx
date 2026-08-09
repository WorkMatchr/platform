import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Section } from '@/components/layout/section'
import { formatEuro } from '@/lib/finance/financial-contract'
import { getPrisma } from '@/lib/prisma'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Factuur | WorkMatchr' }

export default async function InvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params
  const { activeMembership } = await requireOrganizationMembership(undefined, `/credits/facturen/${invoiceId}`)
  const invoice = await getPrisma().financialInvoice.findFirst({
    where: { id: invoiceId, organizationId: activeMembership.organization.id },
  })
  if (!invoice) notFound()
  return <Section spacing="compact" className="max-w-4xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><Heading as="h1" size="h2">{invoice.documentType === 'CREDIT_NOTE' ? 'Creditnota' : 'Factuur'} {invoice.invoiceNumber}</Heading><p className="mt-2 text-text-secondary">Uitgegeven op {invoice.issuedAt.toLocaleDateString('nl-NL')}</p></div><span className="font-semibold">{formatEuro(invoice.amountInclVatCents)}</span></div>
    <Card className="mt-6 grid gap-7">
      <div className="grid gap-5 sm:grid-cols-2"><address className="not-italic"><strong>{invoice.sellerTradeName}</strong><br />{invoice.sellerLegalName}<br />{invoice.sellerAddressLine}<br />{invoice.sellerPostalCode} {invoice.sellerCity}<br />KvK {invoice.sellerKvKNumber}<br />Btw {invoice.sellerVatId}</address><address className="not-italic"><strong>{invoice.customerOrganizationName}</strong><br />{invoice.customerAddressLine}<br />{invoice.customerPostalCode} {invoice.customerCity}<br />{invoice.customerCountryCode}{invoice.customerKvKNumber ? <><br />KvK {invoice.customerKvKNumber}</> : null}{invoice.customerVatId ? <><br />Btw {invoice.customerVatId}</> : null}</address></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[34rem] border-collapse text-left"><thead><tr className="border-b border-border"><th className="py-3">Omschrijving</th><th className="py-3 text-right">Credits</th><th className="py-3 text-right">Excl. btw</th></tr></thead><tbody><tr className="border-b border-border"><td className="py-4">{invoice.packageLabel}</td><td className="py-4 text-right">{invoice.credits}</td><td className="py-4 text-right">{formatEuro(invoice.amountExclVatCents)}</td></tr></tbody></table></div>
      <dl className="ml-auto grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-5 gap-y-2"><dt>Bedrag excl. btw</dt><dd>{formatEuro(invoice.amountExclVatCents)}</dd><dt>Btw ({invoice.vatRateBps / 100}%)</dt><dd>{formatEuro(invoice.vatAmountCents)}</dd><dt className="font-semibold">Totaal incl. btw</dt><dd className="font-semibold">{formatEuro(invoice.amountInclVatCents)}</dd></dl>
    </Card>
  </Section>
}
