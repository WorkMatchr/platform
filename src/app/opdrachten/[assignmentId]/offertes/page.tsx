import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { awardQuoteAction } from '@/app/marktplaats/actions'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { getClientQuotes } from '@/lib/marketplace/dashboard-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Offertes vergelijken | WorkMatchr' }

export default async function ClientQuotesPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/opdrachten/${assignmentId}/offertes`)
  const result = await getClientQuotes(user.id, activeMembership.organization.id, assignmentId).catch(() => null)
  if (!result) notFound()
  const { assignment } = result
  return <Section spacing="compact"><div className="flex flex-wrap items-start justify-between gap-4"><div><Heading as="h1" size="h2">Offertes vergelijken</Heading><p className="mt-3 text-text-secondary">{assignment.title}. U ziet alleen offertes voor uw eigen opdracht.</p></div>{assignment.status === 'OPEN' && <Link className="font-semibold underline" href={`/opdrachten/${assignment.id}/selectie`}>Selectie starten</Link>}</div><div className="mt-8 grid gap-5 lg:grid-cols-2">{assignment.marketplaceQuotes.map((quote) => quote.submittedVersion && <Card key={quote.id}><h2 className="text-xl font-semibold">{quote.providerOrganization.name}</h2><p className="mt-3 text-2xl font-bold">€ {(Number(quote.submittedVersion.priceCents) / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</p><p className="mt-3 whitespace-pre-wrap text-text-secondary">{quote.submittedVersion.approach}</p><h3 className="mt-5 font-semibold">Planning</h3><p className="mt-1 whitespace-pre-wrap">{quote.submittedVersion.planning}</p>{quote.participation.messageChannel && <Link className="mt-5 inline-block font-semibold underline" href={`/berichten/${quote.participation.messageChannel.id}`}>Berichten openen</Link>}{quote.status === 'SUBMITTED' && assignment.status === 'IN_SELECTION' && !assignment.awardDecision && <form action={awardQuoteAction} className="mt-6 grid gap-3 border-t border-border pt-5"><input type="hidden" name="assignmentId" value={assignment.id}/><input type="hidden" name="quoteId" value={quote.id}/><input type="hidden" name="idempotencyKey" value={`AWARD:${assignment.id}:${randomUUID()}`}/><label className="grid gap-2 font-semibold">Motivering<textarea name="motivation" required minLength={10} maxLength={1000} className="min-h-28 rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><Button type="submit" className="justify-self-start">Deze offerte gunnen</Button></form>}<p className="mt-4 text-sm text-text-secondary">Status: {quote.status.toLowerCase()}</p></Card>)}{assignment.marketplaceQuotes.length === 0 && <Card><p>Er zijn nog geen ingediende offertes.</p>{assignment.status === 'OPEN' && <Link className="mt-4 inline-block font-semibold underline" href={`/opdrachten/${assignment.id}/selectie`}>Start de selectie</Link>}</Card>}</div></Section>
}
