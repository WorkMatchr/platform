import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Section } from '@/components/layout/section'
import { CreditPurchaseCheckout } from '@/components/finance/credit-purchase-checkout'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { creditPackageCatalog, formatEuro } from '@/lib/finance/financial-contract'
import { getProSubscriptionStatusLabel, hasActiveProBenefits } from '@/lib/finance/pro-subscription-presentation'
import {
  calculateAuthoritativeMollieCreditPrice,
  usesMollieTestAcceptancePrice,
} from '@/lib/finance/mollie-test-pricing'
import { getProviderCreditOverview } from '@/lib/marketplace/credit-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { getPrisma } from '@/lib/prisma'
import { previewCreditPurchaseAction, startCreditPurchaseAction } from './actions'

export const metadata: Metadata = { title: 'Credits en facturen | WorkMatchr' }

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ fout?: string }> }) {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/credits')
  if (user.accountType !== 'PROFESSIONAL' || !activeMembership.organization.providerProfile) notFound()
  const organizationId = activeMembership.organization.id
  const [overview, organization, purchases, subscription] = await Promise.all([
    getProviderCreditOverview(user.id, organizationId),
    getPrisma().organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        chamberOfCommerceNumber: true,
        locations: { where: { archivedAt: null }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 1 },
      },
    }),
    getPrisma().financialPurchase.findMany({
      where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 20,
      include: { invoice: { select: { id: true, invoiceNumber: true } } },
    }),
    getPrisma().professionalSubscription.findUnique({ where: { organizationId } }),
  ])
  if (!organization) notFound()
  const location = organization.locations[0]
  const { fout } = await searchParams
  const mollieTestAcceptanceActive = usesMollieTestAcceptancePrice('CREDITS_25')
  const hasActivePro = hasActiveProBenefits(subscription)
  const checkoutPackages = creditPackageCatalog.map((item) => ({
    sku: item.sku,
    credits: item.credits,
    normalPackagePriceCents: item.baseAmountCents,
    price: calculateAuthoritativeMollieCreditPrice({ packageSku: item.sku, hasActivePro }),
  }))
  return <Section spacing="compact">
    <Heading as="h1" size="h2">Credits en facturen</Heading>
    <p className="mt-3 max-w-3xl text-text-secondary">Uw creditsaldo wordt uitsluitend opgebouwd uit onveranderbare mutaties. Pakketprijzen, kortingen en btw worden server-side vastgesteld.</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-3">
      <Card className="p-5 sm:p-6"><h2 className="font-semibold">Totaal</h2><p className="mt-2 text-3xl font-bold">{overview.totalBalance}</p></Card>
      <Card className="p-5 sm:p-6"><h2 className="font-semibold">Gereserveerd</h2><p className="mt-2 text-3xl font-bold">{overview.reservedBalance}</p></Card>
      <Card className="p-5 sm:p-6"><h2 className="font-semibold">Beschikbaar</h2><p className="mt-2 text-3xl font-bold">{overview.availableBalance}</p></Card>
    </div>
    <Card className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Credits kopen</h2><p className="mt-1 text-sm text-text-secondary">Pakketprijzen worden exclusief btw getoond. In uw bestelling ziet u vooraf het volledige te betalen bedrag.</p></div><Link className="font-semibold underline" href="/credits/pro">Bekijk Pro</Link></div>
      <CreditPurchaseCheckout
        action={startCreditPurchaseAction}
        billingDetails={{
          organizationName: organization.name,
          addressLine: location?.addressLine ?? '',
          postalCode: location?.postalCode ?? '',
          city: location?.city ?? '',
          countryCode: location?.countryCode ?? 'NL',
          chamberOfCommerceNumber: organization.chamberOfCommerceNumber ?? '',
        }}
        idempotencyKey={`credit-purchase:${randomUUID()}`}
        initialError={fout ? 'De betaling kon niet worden gestart. Uw saldo is niet gewijzigd. Controleer de gegevens of probeer het later opnieuw.' : undefined}
        packages={checkoutPackages}
        previewAction={previewCreditPurchaseAction}
        proStatusLabel={getProSubscriptionStatusLabel(subscription)}
        sandboxActive={mollieTestAcceptanceActive}
      />
    </Card>
    <Card className="mt-6"><h2 className="text-lg font-semibold">Aankopen en facturen</h2><ul className="mt-4 divide-y divide-border">{purchases.map((purchase) => <li key={purchase.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]"><div><p className="font-semibold">{purchase.packageLabel}{purchase.pricingMode === 'MOLLIE_TEST_ACCEPTANCE' ? ' · Sandbox-testbetaling' : ''}</p><p className="text-sm text-text-secondary">{purchase.createdAt.toLocaleString('nl-NL')} · {formatEuro(purchase.amountInclVatCents)} incl. btw · {purchase.status}</p></div>{purchase.invoice ? <Link className="font-semibold underline" href={`/credits/facturen/${purchase.invoice.id}`}>{purchase.invoice.invoiceNumber}</Link> : <Link className="font-semibold underline" href={`/credits/betaling/${purchase.id}`}>Bekijk status</Link>}</li>)}{purchases.length === 0 ? <li className="py-4 text-text-secondary">Er zijn nog geen aankopen.</li> : null}</ul></Card>
    <Card className="mt-6"><h2 className="text-lg font-semibold">Recente creditmutaties</h2><ul className="mt-4 divide-y divide-border">{overview.transactions.map((transaction) => <li key={transaction.id} className="grid gap-1 py-4 sm:grid-cols-[1fr_auto]"><div><p className="font-semibold">{transaction.type}</p><p className="text-sm text-text-secondary">{transaction.reason ?? 'Creditmutatie'} · {transaction.createdAt.toLocaleString('nl-NL')}</p></div><span className="font-semibold">{transaction.amount > 0 ? '+' : ''}{transaction.amount}</span></li>)}{overview.transactions.length === 0 && <li className="py-4 text-text-secondary">Er zijn nog geen creditmutaties.</li>}</ul></Card>
  </Section>
}
