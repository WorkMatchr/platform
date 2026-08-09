import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Section } from '@/components/layout/section'
import { formatEuro } from '@/lib/finance/financial-contract'
import { getPrisma } from '@/lib/prisma'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Betaling | WorkMatchr' }

const statusLabels = {
  CREATED: 'Betaling wordt voorbereid', PAYMENT_PENDING: 'Betaling wordt verwerkt', PAID: 'Betaald',
  FAILED: 'Betaling mislukt', CANCELED: 'Betaling geannuleerd', EXPIRED: 'Betaling verlopen',
  REFUND_REVIEW_REQUIRED: 'Terugbetaling wordt beoordeeld', PARTIALLY_REFUNDED: 'Gedeeltelijk terugbetaald', REFUNDED: 'Terugbetaald',
} as const

export default async function CreditPaymentPage({ params }: { params: Promise<{ purchaseId: string }> }) {
  const { purchaseId } = await params
  const { activeMembership } = await requireOrganizationMembership(undefined, `/credits/betaling/${purchaseId}`)
  const purchase = await getPrisma().financialPurchase.findFirst({
    where: { id: purchaseId, organizationId: activeMembership.organization.id },
    include: { invoice: { select: { id: true, invoiceNumber: true } } },
  })
  if (!purchase) notFound()
  return <Section spacing="compact" className="max-w-3xl">
    <Heading as="h1" size="h2">Uw betaling</Heading>
    <Card className="mt-6 grid gap-4">
      <div><p className="text-sm text-text-secondary">Status</p><p className="font-semibold">{statusLabels[purchase.status]}</p></div>
      <div><p className="text-sm text-text-secondary">Pakket</p><p>{purchase.packageLabel}</p></div>
      <div><p className="text-sm text-text-secondary">Totaal inclusief btw</p><p>{formatEuro(purchase.amountInclVatCents)}</p></div>
      {purchase.invoice ? <div><p className="text-sm text-text-secondary">Factuur</p><Link className="font-semibold underline" href={`/credits/facturen/${purchase.invoice.id}`}>{purchase.invoice.invoiceNumber}</Link></div> : null}
      {purchase.status === 'PAYMENT_PENDING' ? <p className="text-sm text-text-secondary">Mollie bevestigt de betaling rechtstreeks aan WorkMatchr. Vernieuw deze pagina over enkele ogenblikken.</p> : null}
    </Card>
    <div className="mt-6 flex flex-wrap gap-3"><Link className="font-semibold underline" href="/credits">Terug naar credits</Link></div>
  </Section>
}
