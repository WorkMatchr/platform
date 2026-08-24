import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
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
    include: { lines: { orderBy: { position: 'asc' } }, vatSummaries: { orderBy: { vatRateBps: 'asc' } } },
  })
  if (!invoice) notFound()
  return <Section spacing="compact" className="max-w-4xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><Heading as="h1" size="h2">{invoice.documentType === 'CREDIT_NOTE' ? 'Creditnota' : 'Factuur'} {invoice.invoiceNumber}</Heading><p className="mt-2 text-text-secondary">Uitgegeven op {invoice.issuedAt.toLocaleDateString('nl-NL')}</p></div><div className="flex items-center gap-4"><Link className="font-semibold underline" href={`/credits/facturen/${invoice.id}/pdf`}>Download pdf</Link><span className="font-semibold">{formatEuro(invoice.amountInclVatCents)}</span></div></div>
    <Card className="mt-6 grid gap-7">
      {invoice.pricingMode === 'MOLLIE_TEST_ACCEPTANCE' ? <p className="rounded-control border border-brand/30 bg-brand/5 p-3 text-sm"><strong>Mollie-sandboxacceptatie</strong><br />Deze factuur bevat de daadwerkelijk betaalde tijdelijke testprijs en niet de normale catalogusprijs.</p> : null}
      <div className="grid gap-5 sm:grid-cols-2"><address className="not-italic"><strong>{invoice.sellerTradeName}</strong><br />{invoice.sellerLegalName}<br />{invoice.sellerAddressLine}<br />{invoice.sellerPostalCode} {invoice.sellerCity}<br />KvK {invoice.sellerKvKNumber}<br />Btw {invoice.sellerVatId}</address><address className="not-italic"><strong>{invoice.customerOrganizationName}</strong><br />{invoice.customerAddressLine}<br />{invoice.customerPostalCode} {invoice.customerCity}<br />{invoice.customerCountryCode}{invoice.customerKvKNumber ? <><br />KvK {invoice.customerKvKNumber}</> : null}{invoice.customerVatId ? <><br />Btw {invoice.customerVatId}</> : null}</address></div>
      {invoice.snapshotVersion === 2 ? <>
        <dl className="grid gap-2 text-sm sm:grid-cols-2"><div><dt className="font-semibold">Lever-/prestatiedatum</dt><dd>{invoice.supplyDate?.toLocaleDateString('nl-NL')}</dd></div>{invoice.advancePaymentDate ? <div><dt className="font-semibold">Vooruitbetalingsdatum</dt><dd>{invoice.advancePaymentDate.toLocaleDateString('nl-NL')}</dd></div> : null}{invoice.servicePeriodStart && invoice.servicePeriodEnd ? <div><dt className="font-semibold">Dienstperiode</dt><dd>{invoice.servicePeriodStart.toLocaleDateString('nl-NL')} t/m {invoice.servicePeriodEnd.toLocaleDateString('nl-NL')}</dd></div> : null}</dl>
        <div className="overflow-x-auto"><table className="w-full min-w-[54rem] border-collapse text-left"><thead><tr className="border-b border-border"><th className="py-3">Omschrijving</th><th className="py-3 text-right">Aantal</th><th className="py-3">Eenheid</th><th className="py-3 text-right">Eenheidsprijs</th><th className="py-3 text-right">Korting</th><th className="py-3 text-right">Netto</th><th className="py-3 text-right">Btw</th><th className="py-3 text-right">Incl. btw</th></tr></thead><tbody>{invoice.lines.map((line) => <tr key={line.id} className="border-b border-border"><td className="py-4">{line.description}{line.servicePeriodStart && line.servicePeriodEnd ? <span className="block text-xs text-text-secondary">{line.servicePeriodStart.toLocaleDateString('nl-NL')} t/m {line.servicePeriodEnd.toLocaleDateString('nl-NL')}</span> : null}</td><td className="py-4 text-right">{line.quantity}</td><td className="py-4">{line.unit}</td><td className="py-4 text-right">{formatEuro(line.unitPriceExclVatCents)}</td><td className="py-4 text-right">{formatEuro(line.discountAmountCents)}</td><td className="py-4 text-right">{formatEuro(line.netAmountExclVatCents)}</td><td className="py-4 text-right">{line.vatRateBps / 100}% · {formatEuro(line.vatAmountCents)}</td><td className="py-4 text-right">{formatEuro(line.amountInclVatCents)}</td></tr>)}</tbody></table></div>
      </> : <div className="overflow-x-auto"><table className="w-full min-w-[34rem] border-collapse text-left"><thead><tr className="border-b border-border"><th className="py-3">Omschrijving</th><th className="py-3 text-right">Credits</th><th className="py-3 text-right">Excl. btw</th></tr></thead><tbody><tr className="border-b border-border"><td className="py-4">{invoice.packageLabel}</td><td className="py-4 text-right">{invoice.credits}</td><td className="py-4 text-right">{formatEuro(invoice.amountExclVatCents)}</td></tr></tbody></table></div>}
      <dl className="ml-auto grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-5 gap-y-2"><dt>Bedrag excl. btw</dt><dd>{formatEuro(invoice.amountExclVatCents)}</dd>{invoice.snapshotVersion === 2 ? invoice.vatSummaries.map((summary) => <div className="contents" key={summary.id}><dt>Btw {summary.vatRateBps / 100}% over {formatEuro(summary.taxableAmountExclVatCents)}</dt><dd>{formatEuro(summary.vatAmountCents)}</dd></div>) : <><dt>Btw ({invoice.vatRateBps / 100}%)</dt><dd>{formatEuro(invoice.vatAmountCents)}</dd></>}<dt className="font-semibold">Totaal incl. btw</dt><dd className="font-semibold">{formatEuro(invoice.amountInclVatCents)}</dd></dl>
    </Card>
  </Section>
}
