import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { getProviderCreditOverview } from '@/lib/marketplace/credit-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Credits | WorkMatchr' }

export default async function CreditsPage() {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/credits')
  if (!activeMembership.organization.providerProfile) notFound()
  const overview = await getProviderCreditOverview(user.id, activeMembership.organization.id)
  return <Section spacing="compact"><Heading as="h1" size="h2">Credits</Heading><p className="mt-3 text-text-secondary">Credits worden gereserveerd bij deelname en definitief besteed bij een geldige offerte. Credits kopen is nog niet beschikbaar.</p><div className="mt-8 grid gap-5 sm:grid-cols-3"><Card><h2 className="font-semibold">Beschikbaar</h2><p className="mt-2 text-3xl font-bold">{overview.availableBalance}</p></Card><Card><h2 className="font-semibold">Gereserveerd</h2><p className="mt-2 text-3xl font-bold">{overview.reservedBalance}</p></Card><Card><h2 className="font-semibold">Besteed</h2><p className="mt-2 text-3xl font-bold">{overview.spentBalance}</p></Card></div><Card className="mt-6"><h2 className="text-lg font-semibold">Recente mutaties</h2><ul className="mt-4 divide-y divide-border">{overview.transactions.map((transaction) => <li key={transaction.id} className="grid gap-1 py-4 sm:grid-cols-[1fr_auto]"><div><p className="font-semibold">{transaction.type}</p><p className="text-sm text-text-secondary">{transaction.reason ?? 'Creditmutatie'} · {transaction.createdAt.toLocaleString('nl-NL')}</p></div><span className="font-semibold">{transaction.amount > 0 ? '+' : ''}{transaction.amount}</span></li>)}{overview.transactions.length === 0 && <li className="py-4 text-text-secondary">Er zijn nog geen creditmutaties.</li>}</ul></Card></Section>
}
