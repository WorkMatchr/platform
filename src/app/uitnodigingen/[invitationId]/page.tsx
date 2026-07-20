import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { acceptProviderInvitationAction, declineProviderInvitationAction } from '@/app/marktplaats/actions'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { getProviderInvitationDetail } from '@/lib/marketplace/dashboard-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Uitnodiging | WorkMatchr' }

export default async function InvitationPage({ params }: { params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/uitnodigingen/${invitationId}`)
  const result = await getProviderInvitationDetail(user.id, activeMembership.organization.id, invitationId).catch(() => null)
  if (!result) notFound()
  const { invitation, membership } = result
  return <Section spacing="compact"><Heading as="h1" size="h2">Uitnodiging voor een opdracht</Heading><Card className="mt-8"><h2 className="text-xl font-semibold">{invitation.assignment.title}</h2><p className="mt-3 whitespace-pre-wrap text-text-secondary">{invitation.assignment.description}</p><dl className="mt-6 grid gap-4 sm:grid-cols-2"><div><dt className="font-semibold">Deadline</dt><dd>{invitation.deadlineAt.toLocaleString('nl-NL')}</dd></div><div><dt className="font-semibold">Benodigde credits</dt><dd>{invitation.creditCost}</dd></div></dl>{invitation.participation ? <div className="mt-6 flex flex-wrap gap-3">{invitation.participation.quote ? <Link className="font-semibold underline" href={`/offertes/${invitation.participation.quote.id}`}>Open uw offerte</Link> : <Link className="font-semibold underline" href={`/offertes/nieuw?deelname=${invitation.participation.id}`}>Maak een offerte</Link>}{invitation.participation.messageChannel && <Link className="font-semibold underline" href={`/berichten/${invitation.participation.messageChannel.id}`}>Open berichten</Link>}</div> : membership.role !== 'MEMBER' && invitation.status === 'INVITED' ? <div className="mt-6 grid gap-6 lg:grid-cols-2"><form action={acceptProviderInvitationAction}><input type="hidden" name="invitationId" value={invitation.id}/><input type="hidden" name="idempotencyKey" value={`ACCEPT:${invitation.id}:${randomUUID()}`}/><Button type="submit">Deelnemen en {invitation.creditCost} credits reserveren</Button><p className="mt-3 text-sm text-text-secondary">De credits worden pas definitief besteed wanneer u een geldige offerte indient.</p></form><form action={declineProviderInvitationAction} className="grid gap-3"><label className="grid gap-2 font-semibold">Reden voor niet deelnemen<textarea name="reason" required minLength={10} maxLength={500} className="min-h-24 rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><input type="hidden" name="invitationId" value={invitation.id}/><input type="hidden" name="idempotencyKey" value={`DECLINE:${invitation.id}:${randomUUID()}`}/><Button type="submit" variant="secondary" className="justify-self-start">Niet deelnemen</Button></form></div> : <p className="mt-6 text-text-secondary">U kunt deze uitnodiging alleen-lezen bekijken.</p>}</Card></Section>
}
