import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { creditPackageCatalog, formatEuro } from '@/lib/finance/financial-contract'
import { getProSubscriptionStatusLabel } from '@/lib/finance/pro-subscription-presentation'
import { getProviderCreditOverview } from '@/lib/marketplace/credit-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { getPrisma } from '@/lib/prisma'
import { startCreditPurchaseAction } from './actions'

export const metadata: Metadata = { title: 'Credits en facturen | WorkMatchr' }

const inputClassName = 'min-h-11 w-full rounded-control border border-border bg-surface px-3 py-2 text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary'

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
  return <Section spacing="compact">
    <Heading as="h1" size="h2">Credits en facturen</Heading>
    <p className="mt-3 max-w-3xl text-text-secondary">Uw creditsaldo wordt uitsluitend opgebouwd uit onveranderbare mutaties. Pakketprijzen, kortingen en btw worden server-side vastgesteld.</p>
    {fout ? <p className="mt-5 rounded-control border border-danger/30 bg-danger/5 p-4" role="alert">De betaling kon niet worden gestart. Uw saldo is niet gewijzigd. Controleer de gegevens of probeer het later opnieuw.</p> : null}
    <div className="mt-7 grid gap-4 sm:grid-cols-3">
      <Card className="p-5 sm:p-6"><h2 className="font-semibold">Totaal</h2><p className="mt-2 text-3xl font-bold">{overview.totalBalance}</p></Card>
      <Card className="p-5 sm:p-6"><h2 className="font-semibold">Gereserveerd</h2><p className="mt-2 text-3xl font-bold">{overview.reservedBalance}</p></Card>
      <Card className="p-5 sm:p-6"><h2 className="font-semibold">Beschikbaar</h2><p className="mt-2 text-3xl font-bold">{overview.availableBalance}</p></Card>
    </div>
    <Card className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Credits kopen</h2><p className="mt-1 text-sm text-text-secondary">Alle bedragen hieronder zijn exclusief 21% btw. Een actieve WorkMatchr Pro-organisatie ontvangt automatisch 10% extra pakketkorting.</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-brand-primary-subtle px-3 py-1 text-sm font-semibold">Pro: {getProSubscriptionStatusLabel(subscription)}</span><Link className="font-semibold underline" href="/credits/pro">Bekijk Pro</Link></div></div>
      <form action={startCreditPurchaseAction} className="mt-6 grid gap-5">
        <input type="hidden" name="idempotencyKey" value={`credit-purchase:${randomUUID()}`} />
        <label className="grid gap-2 font-semibold">Creditpakket<select className={inputClassName} name="packageSku" required>{creditPackageCatalog.map((item) => {
          const packageDiscount = Math.round(item.baseAmountCents * item.packageDiscountBps / 10_000)
          return <option key={item.sku} value={item.sku}>{item.credits} credits — {formatEuro(item.baseAmountCents - packageDiscount)} excl. btw</option>
        })}</select></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 font-semibold">Organisatienaam<input className={inputClassName} name="organizationName" defaultValue={organization.name} required /></label>
          <label className="grid gap-2 font-semibold">Adres<input className={inputClassName} name="addressLine" defaultValue={location?.addressLine ?? ''} required /></label>
          <label className="grid gap-2 font-semibold">Postcode<input className={inputClassName} name="postalCode" defaultValue={location?.postalCode ?? ''} required /></label>
          <label className="grid gap-2 font-semibold">Plaats<input className={inputClassName} name="city" defaultValue={location?.city ?? ''} required /></label>
          <label className="grid gap-2 font-semibold">Landcode<input className={inputClassName} name="countryCode" defaultValue={location?.countryCode ?? 'NL'} required maxLength={2} /></label>
          <label className="grid gap-2 font-semibold">KvK-nummer <span className="font-normal text-text-secondary">(optioneel)</span><input className={inputClassName} name="chamberOfCommerceNumber" defaultValue={organization.chamberOfCommerceNumber ?? ''} /></label>
          <label className="grid gap-2 font-semibold">Btw-id <span className="font-normal text-text-secondary">(optioneel)</span><input className={inputClassName} name="vatId" /></label>
          <label className="grid gap-2 font-semibold">Kortingscode <span className="font-normal text-text-secondary">(niet combineerbaar met Pro)</span><input className={inputClassName} name="discountCode" /></label>
        </div>
        <p className="text-sm text-text-secondary">Controleer het factuuradres. De definitieve factuur blijft ongewijzigd wanneer uw organisatiegegevens later wijzigen.</p>
        <Button type="submit" className="justify-self-start">Ga veilig naar Mollie</Button>
      </form>
    </Card>
    <Card className="mt-6"><h2 className="text-lg font-semibold">Aankopen en facturen</h2><ul className="mt-4 divide-y divide-border">{purchases.map((purchase) => <li key={purchase.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]"><div><p className="font-semibold">{purchase.packageLabel}</p><p className="text-sm text-text-secondary">{purchase.createdAt.toLocaleString('nl-NL')} · {formatEuro(purchase.amountInclVatCents)} incl. btw · {purchase.status}</p></div>{purchase.invoice ? <Link className="font-semibold underline" href={`/credits/facturen/${purchase.invoice.id}`}>{purchase.invoice.invoiceNumber}</Link> : <Link className="font-semibold underline" href={`/credits/betaling/${purchase.id}`}>Bekijk status</Link>}</li>)}{purchases.length === 0 ? <li className="py-4 text-text-secondary">Er zijn nog geen aankopen.</li> : null}</ul></Card>
    <Card className="mt-6"><h2 className="text-lg font-semibold">Recente creditmutaties</h2><ul className="mt-4 divide-y divide-border">{overview.transactions.map((transaction) => <li key={transaction.id} className="grid gap-1 py-4 sm:grid-cols-[1fr_auto]"><div><p className="font-semibold">{transaction.type}</p><p className="text-sm text-text-secondary">{transaction.reason ?? 'Creditmutatie'} · {transaction.createdAt.toLocaleString('nl-NL')}</p></div><span className="font-semibold">{transaction.amount > 0 ? '+' : ''}{transaction.amount}</span></li>)}{overview.transactions.length === 0 && <li className="py-4 text-text-secondary">Er zijn nog geen creditmutaties.</li>}</ul></Card>
  </Section>
}
