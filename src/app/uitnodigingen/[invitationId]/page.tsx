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

const purchaseErrors: Record<string, string> = {
  INSUFFICIENT_CREDITS: 'Uw creditsaldo is te laag. Koop eerst credits om deze opdracht te kunnen kopen.',
  FULL: 'Deze opdracht is inmiddels door drie professionals gekocht.',
  INVALID_STATE: 'Deze opdracht kan op dit moment niet worden gekocht.',
  DEADLINE_PASSED: 'De reactietermijn voor deze opdracht is verstreken.',
}

export default async function InvitationPage({ params, searchParams }: { params: Promise<{ invitationId: string }>; searchParams: Promise<{ purchaseError?: string }> }) {
  const { invitationId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/uitnodigingen/${invitationId}`)
  const result = await getProviderInvitationDetail(user.id, activeMembership.organization.id, invitationId).catch(() => null)
  if (!result) notFound()
  const { invitation, membership, availableCredits } = result
  const { purchaseError } = await searchParams
  const preview = invitation.preview
  return <Section spacing="compact"><Heading as="h1" size="h2">Bekijk opdracht en beslis</Heading><Card className="mt-8"><h2 className="text-xl font-semibold">{preview.safeSummary}</h2><dl className="mt-6 grid gap-4 sm:grid-cols-2"><div><dt className="font-semibold">Soort opdracht</dt><dd>{preview.kind}</dd></div><div><dt className="font-semibold">Regio</dt><dd>{preview.region ?? 'Nog niet vermeld'}</dd></div><div><dt className="font-semibold">Gewenste planning</dt><dd>{preview.desiredStartDate?.toLocaleDateString('nl-NL') ?? 'In overleg'}</dd></div><div><dt className="font-semibold">Omvang</dt><dd>{preview.employeeCount ? `${preview.employeeCount} medewerkers` : 'Nog niet vermeld'}{preview.locationCount ? ` · ${preview.locationCount} locaties` : ''}</dd></div><div><dt className="font-semibold">Uw creditsaldo</dt><dd>{availableCredits} credits</dd></div><div><dt className="font-semibold">Prijs</dt><dd>25 credits</dd></div></dl><p className="mt-5 text-sm text-text-secondary">Maximaal {preview.maximumPurchasers} professionals kunnen deze opdracht kopen.</p>{purchaseError && purchaseErrors[purchaseError] && <p role="alert" className="mt-5 rounded-control border border-error/30 bg-error/5 p-4 text-sm text-error">{purchaseErrors[purchaseError]}</p>}{invitation.fullAssignment ? <div className="mt-7 border-t border-border pt-6"><h3 className="font-semibold">Volledige opdrachtinformatie</h3><p className="mt-3 whitespace-pre-wrap text-text-secondary">{invitation.fullAssignment.description}</p><dl className="mt-5 grid gap-3 sm:grid-cols-2"><div><dt className="font-semibold">Opdrachtgever</dt><dd>{invitation.fullAssignment.clientOrganization.name}</dd></div><div><dt className="font-semibold">Contact</dt><dd>{invitation.fullAssignment.clientOrganization.generalEmail ?? invitation.fullAssignment.clientOrganization.phone ?? 'Via WorkMatchr-berichten'}</dd></div><div><dt className="font-semibold">Locatie</dt><dd>{[invitation.fullAssignment.locationName, invitation.fullAssignment.locationAddressLine, invitation.fullAssignment.locationPostalCode, invitation.fullAssignment.locationCity].filter(Boolean).join(', ') || 'In overleg'}</dd></div><div><dt className="font-semibold">Toelichting locatie</dt><dd>{invitation.fullAssignment.locationDescription ?? 'Niet vermeld'}</dd></div></dl><div className="mt-6 flex flex-wrap gap-3">{invitation.participation?.quote ? <Link className="font-semibold underline" href={`/offertes/${invitation.participation.quote.id}`}>Open uw offerte</Link> : invitation.participation && <Link className="font-semibold underline" href={`/offertes/nieuw?deelname=${invitation.participation.id}`}>Maak een offerte</Link>}{invitation.participation?.messageChannel && <Link className="font-semibold underline" href={`/berichten/${invitation.participation.messageChannel.id}`}>Open berichten</Link>}</div></div> : membership.role !== 'MEMBER' && invitation.status === 'INVITED' ? <div className="mt-6 grid gap-6 lg:grid-cols-2"><form action={acceptProviderInvitationAction}><input type="hidden" name="invitationId" value={invitation.id}/><input type="hidden" name="idempotencyKey" value={`PURCHASE:${invitation.id}:${randomUUID()}`}/><p className="mb-4 text-sm">Bij bevestiging worden 25 credits direct en definitief afgeschreven. Daarna krijgt u toegang tot de volledige opdrachtinformatie.</p><Button type="submit" disabled={availableCredits < 25}>Opdracht kopen — 25 credits</Button>{availableCredits < 25 && <Link className="ml-4 text-sm font-semibold underline" href="/credits">Credits bijkopen</Link>}</form><form action={declineProviderInvitationAction} className="grid gap-3"><label className="grid gap-2 font-semibold">Reden voor niet deelnemen<textarea name="reason" required minLength={10} maxLength={500} className="min-h-24 rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><input type="hidden" name="invitationId" value={invitation.id}/><input type="hidden" name="idempotencyKey" value={`DECLINE:${invitation.id}:${randomUUID()}`}/><Button type="submit" variant="secondary" className="justify-self-start">Niet deelnemen</Button></form></div> : <p className="mt-6 text-text-secondary">U kunt deze uitnodiging alleen bekijken.</p>}</Card></Section>
}
