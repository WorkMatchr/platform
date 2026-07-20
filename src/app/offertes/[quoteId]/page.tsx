import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { submitQuoteAction } from '@/app/marktplaats/actions'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { getProviderQuoteDetail } from '@/lib/marketplace/dashboard-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Uw offerte | WorkMatchr' }

export default async function QuotePage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/offertes/${quoteId}`)
  const result = await getProviderQuoteDetail(user.id, activeMembership.organization.id, quoteId).catch(() => null)
  if (!result) notFound()
  const { quote, membership } = result
  const currentVersion = quote.currentVersion
  if (!currentVersion) notFound()
  return <Section spacing="compact"><Heading as="h1" size="h2">Uw offerte</Heading><p className="mt-3 text-text-secondary">Voor {quote.participation.assignment.title} · status {quote.status.toLowerCase()}.</p><Card className="mt-8"><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="font-semibold">Prijs</dt><dd>€ {(Number(currentVersion.priceCents) / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</dd></div><div><dt className="font-semibold">Versie</dt><dd>{currentVersion.version}</dd></div><div className="sm:col-span-2"><dt className="font-semibold">Aanpak</dt><dd className="mt-1 whitespace-pre-wrap">{currentVersion.approach}</dd></div><div className="sm:col-span-2"><dt className="font-semibold">Planning</dt><dd className="mt-1 whitespace-pre-wrap">{currentVersion.planning}</dd></div></dl>{quote.status === 'DRAFT' && membership.role !== 'MEMBER' && <div className="mt-6 flex flex-wrap gap-3"><Link className="font-semibold underline" href={`/offertes/nieuw?deelname=${quote.participation.id}`}>Concept aanpassen</Link><form action={submitQuoteAction}><input type="hidden" name="quoteId" value={quote.id}/><input type="hidden" name="expectedQuoteVersion" value={quote.version}/><input type="hidden" name="idempotencyKey" value={`SUBMIT:${quote.id}:${randomUUID()}`}/><Button type="submit">Definitief indienen</Button></form></div>}{quote.participation.messageChannel && <Link className="mt-6 inline-block font-semibold underline" href={`/berichten/${quote.participation.messageChannel.id}`}>Open berichten</Link>}</Card></Section>
}
