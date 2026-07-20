import type { Metadata } from 'next'
import Link from 'next/link'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { getMarketplaceDashboard } from '@/lib/marketplace/dashboard-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Uitnodigingen | WorkMatchr' }

export default async function InvitationsPage() {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/uitnodigingen')
  const dashboard = await getMarketplaceDashboard(user.id, activeMembership.organization.id)
  if (dashboard.kind !== 'PROVIDER') notFound()
  return <Section spacing="compact"><Heading as="h1" size="h2">Uitnodigingen</Heading><p className="mt-3 text-text-secondary">Beslis per uitnodiging of uw organisatie wil deelnemen.</p><div className="mt-8 grid gap-4">{dashboard.invitations.map((invitation) => <Card key={invitation.id}><p className="font-semibold">Status: {invitation.status}</p><p className="mt-2 text-text-secondary">Reageren kan tot {invitation.deadlineAt.toLocaleString('nl-NL')} · {invitation.creditCost} credits</p><Link className="mt-4 inline-block font-semibold underline" href={`/uitnodigingen/${invitation.id}`}>Uitnodiging openen</Link></Card>)}{dashboard.invitations.length === 0 && <Card><p>Er zijn nog geen uitnodigingen.</p></Card>}</div></Section>
}
